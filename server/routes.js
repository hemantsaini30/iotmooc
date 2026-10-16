import express from 'express';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import Assignment from './models/Assignment.js';
import Question from './models/Question.js';
import Attempt from './models/Attempt.js';
import testRouter from './testRoutes.js';
import { buildAttemptView, publicQuestion } from './views.js';
import { buildAttemptOrder } from '../lib/selection.js';
import { computeResult, isAnswerCorrect, normalizeSelection } from '../lib/scoring.js';
import { deriveQuestionType, isValidAssignmentId, isValidQuestionId } from '../lib/questionBank.js';

const router = express.Router();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Every route (except health) needs the DB; the connection is cached across invocations.
router.get('/health', (req, res) => res.json({ ok: true }));
router.use(wrap(async (req, res, next) => {
  await connectDB();
  next();
}));

// Load an attempt's questions in the attempt's fixed order.
async function loadOrderedQuestions(attempt) {
  const docs = await Question.find({ questionId: { $in: attempt.questionIds } }).lean();
  const byId = new Map(docs.map((q) => [q.questionId, q]));
  return attempt.questionIds.map((id) => byId.get(id)).filter(Boolean);
}
async function loadAttempt(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid attempt id.');
  const attempt = await Attempt.findById(id).lean();
  // Test attempts (mode 'full') must never be readable or checkable through the practice endpoints.
  if (!attempt || attempt.mode !== 'practice') throw new HttpError(404, 'Attempt not found.');
  return attempt;
}
async function attemptView(attempt) {
  const [assignment, questions] = await Promise.all([
    attempt.assignmentId ? Assignment.findOne({ assignmentId: attempt.assignmentId }).lean() : null,
    loadOrderedQuestions(attempt),
  ]);
  return buildAttemptView(attempt, assignment, questions);
}

// GET /api/assignments  -> all assignment slots with availability
router.get('/assignments', wrap(async (req, res) => {
  const list = await Assignment.find().sort({ number: 1 }).lean();
  res.json(list.map(({ assignmentId, number, title, description, available, totalQuestions }) => (
    { assignmentId, number, title, description, available, totalQuestions }
  )));
}));

// GET /api/assignments/:assignmentId/questions -> questions WITHOUT answers or explanations
router.get('/assignments/:assignmentId/questions', wrap(async (req, res) => {
  const { assignmentId } = req.params;
  if (!isValidAssignmentId(assignmentId)) throw new HttpError(400, 'Invalid assignment id.');
  const assignment = await Assignment.findOne({ assignmentId }).lean();
  if (!assignment) throw new HttpError(404, 'Assignment not found.');
  if (!assignment.available) throw new HttpError(409, 'This assignment is not available yet.');
  const questions = await Question.find({ assignmentId }).sort({ questionNumber: 1 }).lean();
  res.json({ assignmentId, questions: questions.map(publicQuestion) });
}));

// POST /api/attempts { assignmentId, order: 'ordered' | 'random' }
router.post('/attempts', wrap(async (req, res) => {
  const { assignmentId, order } = req.body || {};
  if (!isValidAssignmentId(assignmentId)) throw new HttpError(400, 'Invalid assignment id.');
  if (!['ordered', 'random'].includes(order)) throw new HttpError(400, 'order must be "ordered" or "random".');
  const assignment = await Assignment.findOne({ assignmentId }).lean();
  if (!assignment) throw new HttpError(404, 'Assignment not found.');
  if (!assignment.available) throw new HttpError(409, 'This assignment is not available yet.');
  const questions = await Question.find({ assignmentId }).lean();
  if (questions.length === 0) throw new HttpError(409, 'This assignment has no questions yet.');
  // The order is decided ONCE here (on the server) and then stored with the attempt.
  const questionIds = buildAttemptOrder(questions, order);
  const attempt = await Attempt.create({ mode: 'practice', assignmentId, orderMode: order, questionIds });
  res.status(201).json(await attemptView(attempt.toObject()));
}));

// GET /api/attempts/:id -> current state (resume, results). Answers only for checked questions.
router.get('/attempts/:id', wrap(async (req, res) => {
  res.json(await attemptView(await loadAttempt(req.params.id)));
}));

// POST /api/attempts/:id/check { questionId, selected: ['A'] }
router.post('/attempts/:id/check', wrap(async (req, res) => {
  const attempt = await loadAttempt(req.params.id);
  const { questionId, selected } = req.body || {};
  if (!isValidQuestionId(questionId)) throw new HttpError(400, 'Invalid question id.');
  if (attempt.submittedAt) throw new HttpError(409, 'This attempt has already been submitted.');
  if (!attempt.questionIds.includes(questionId)) throw new HttpError(400, 'Question is not part of this attempt.');
  if (attempt.answers.some((a) => a.questionId === questionId)) {
    throw new HttpError(409, 'This question has already been checked.');
  }
  const question = await Question.findOne({ questionId }).lean();
  if (!question) throw new HttpError(404, 'Question not found.');
  const type = deriveQuestionType(question);
  if (!type) throw new HttpError(500, 'This question is flagged for review (invalid answer key).');
  const sel = normalizeSelection({ ...question, type }, selected);
  if (!sel.ok) throw new HttpError(400, sel.error);
  const isCorrect = isAnswerCorrect(question.correctAnswers, sel.value);
  // Conditional update: only succeeds if this question is not yet recorded -> no double-checking races.
  const upd = await Attempt.updateOne(
    { _id: attempt._id, submittedAt: null, 'answers.questionId': { $ne: questionId } },
    { $push: { answers: { questionId, selected: sel.value, isCorrect, checkedAt: new Date() } } }
  );
  if (upd.modifiedCount === 0) throw new HttpError(409, 'This question has already been checked.');
  res.json({
    questionId,
    selected: sel.value,
    isCorrect,
    correctAnswers: question.correctAnswers,
    explanation: question.explanation,
  });
}));

// POST /api/attempts/:id/submit -> only allowed once every question is checked. Idempotent.
router.post('/attempts/:id/submit', wrap(async (req, res) => {
  let attempt = await loadAttempt(req.params.id);
  if (!attempt.submittedAt) {
    if (attempt.answers.length < attempt.questionIds.length) {
      throw new HttpError(400, 'Check every question before finishing.');
    }
    const questions = await loadOrderedQuestions(attempt);
    const submittedAt = new Date();
    const result = computeResult(questions, attempt.answers, { startedAt: attempt.startedAt, submittedAt });
    await Attempt.updateOne({ _id: attempt._id, submittedAt: null }, { $set: { submittedAt, result } });
    attempt = await loadAttempt(req.params.id); // re-read: returns the stored result even if a race occurred
  }
  res.json(await attemptView(attempt));
}));

// Random multi-assignment tests: /api/tests/*
router.use('/tests', testRouter);

export default router;