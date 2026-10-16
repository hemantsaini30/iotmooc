// Random multi-assignment tests, mounted at /api/tests (see routes.js).
//
//   GET  /api/tests              -> which test lengths can be offered right now
//   POST /api/tests {length}     -> create a test (question order is chosen once and stored)
//   GET  /api/tests/:id          -> questions WITHOUT answers (in progress) or result + review (submitted)
//   POST /api/tests/:id/submit   -> grade on the server; idempotent
//
// Correct answers and explanations are only ever returned after submission, and then only for the
// incorrect/skipped questions.
import express from 'express';
import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import Question from './models/Question.js';
import Attempt from './models/Attempt.js';
import { publicQuestion } from './views.js';
import { FULL_TEST_LENGTHS, getAvailableTestLengths, selectRandomQuestions } from '../lib/selection.js';
import { computeResult } from '../lib/scoring.js';
import { deriveQuestionType } from '../lib/questionBank.js';
import { buildReview, gradeSubmission } from '../lib/testGrading.js';

const router = express.Router();
const httpError = (status, message) => Object.assign(new Error(message), { status });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Pool = every question of every available assignment (grows automatically as assignments are imported).
async function availableAssignmentIds() {
  const list = await Assignment.find({ available: true }).select('assignmentId').lean();
  return list.map((a) => a.assignmentId);
}

async function loadTest(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid test id.');
  const attempt = await Attempt.findById(id).lean();
  if (!attempt || attempt.mode !== 'full') throw httpError(404, 'Test not found.');
  return attempt;
}

async function loadOrderedQuestions(attempt) {
  const docs = await Question.find({ questionId: { $in: attempt.questionIds } }).lean();
  const byId = new Map(docs.map((q) => [q.questionId, q]));
  return attempt.questionIds.map((id) => byId.get(id)).filter(Boolean);
}

function testView(attempt, orderedQuestions) {
  const base = {
    attemptId: String(attempt._id),
    testLength: attempt.questionIds.length,
    total: attempt.questionIds.length,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
  };
  if (!attempt.submittedAt) {
    // In progress: no answers, no explanations.
    return { ...base, questions: orderedQuestions.map(publicQuestion) };
  }
  return { ...base, result: attempt.result, review: buildReview(orderedQuestions, attempt.answers) };
}

router.get('/', wrap(async (req, res) => {
  const ids = await availableAssignmentIds();
  const poolSize = await Question.countDocuments({ assignmentId: { $in: ids } });
  res.json({ poolSize, tests: getAvailableTestLengths(poolSize, FULL_TEST_LENGTHS) });
}));

router.post('/', wrap(async (req, res) => {
  const { length } = req.body || {};
  if (!Number.isInteger(length) || !FULL_TEST_LENGTHS.includes(length)) {
    throw httpError(400, `length must be one of ${FULL_TEST_LENGTHS.join(', ')}.`);
  }
  const ids = await availableAssignmentIds();
  const pool = (await Question.find({ assignmentId: { $in: ids } }).lean())
    .filter((q) => deriveQuestionType(q) !== null); // never serve a question with a bad answer key
  if (pool.length < length) {
    throw httpError(409, `This test needs ${length} questions but only ${pool.length} are available right now.`);
  }
  // Chosen ONCE here (server-side) and stored with the attempt, so the order never changes.
  const selected = selectRandomQuestions(pool, length);
  const attempt = await Attempt.create({
    mode: 'full', assignmentId: null, orderMode: 'random', questionIds: selected.map((q) => q.questionId),
  });
  res.status(201).json(testView(attempt.toObject(), selected));
}));

router.get('/:id', wrap(async (req, res) => {
  const attempt = await loadTest(req.params.id);
  res.json(testView(attempt, await loadOrderedQuestions(attempt)));
}));

router.post('/:id/submit', wrap(async (req, res) => {
  let attempt = await loadTest(req.params.id);
  const questions = await loadOrderedQuestions(attempt);
  if (!attempt.submittedAt) {
    const graded = gradeSubmission(questions, req.body?.answers);
    if (!graded.ok) throw httpError(400, graded.error);
    const submittedAt = new Date();
    const result = computeResult(questions, graded.answers, { startedAt: attempt.startedAt, submittedAt });
    // Conditional update: a second submission cannot overwrite the stored result.
    await Attempt.updateOne({ _id: attempt._id, submittedAt: null }, { $set: { answers: graded.answers, submittedAt, result } });
    attempt = await loadTest(req.params.id);
  }
  res.json(testView(attempt, questions));
}));

export default router;