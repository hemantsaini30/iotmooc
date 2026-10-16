// Server-side grading helpers for /tests. Pure functions (no I/O) so they can be unit-tested.
import { isAnswerCorrect, normalizeSelection } from './scoring.js';
import { deriveQuestionType } from './questionBank.js';

/**
 * Validate and grade a submission.
 * `submitted` is { [questionId]: ['A', 'C'] }. Missing or empty entries are skipped questions.
 * Correctness always comes from the question documents, never from the client.
 * Returns { ok: true, answers: [{ questionId, selected, isCorrect }] } or { ok: false, error }.
 */
export function gradeSubmission(questions, submitted) {
  if (submitted == null) submitted = {};
  if (typeof submitted !== 'object' || Array.isArray(submitted)) {
    return { ok: false, error: 'answers must be an object keyed by question id.' };
  }
  const byId = new Map(questions.map((q) => [q.questionId, q]));
  const answers = [];
  for (const [questionId, selected] of Object.entries(submitted)) {
    const q = byId.get(questionId);
    if (!q) return { ok: false, error: 'Submission contains a question that is not part of this test.' };
    if (selected == null || (Array.isArray(selected) && selected.length === 0)) continue; // skipped
    const type = deriveQuestionType(q);
    if (!type) return { ok: false, error: 'A question in this test has an invalid answer key.' };
    const sel = normalizeSelection({ ...q, type }, selected);
    if (!sel.ok) return { ok: false, error: sel.error };
    answers.push({ questionId, selected: sel.value, isCorrect: isAnswerCorrect(q.correctAnswers, sel.value) });
  }
  return { ok: true, answers };
}

/**
 * Review list containing ONLY incorrect and skipped questions, in test order.
 * Correctly answered questions are deliberately left out.
 */
export function buildReview(orderedQuestions, answers) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const review = [];
  orderedQuestions.forEach((q, i) => {
    const a = byId.get(q.questionId);
    if (a && a.isCorrect) return;
    review.push({
      number: i + 1, // position in this test
      questionId: q.questionId,
      questionNumber: q.questionNumber, // original number within its assignment
      questionText: q.questionText,
      options: q.options.map((o) => ({ key: o.key, text: o.text })),
      type: deriveQuestionType(q),
      status: a ? 'incorrect' : 'skipped',
      selected: a ? a.selected : [],
      correctAnswers: q.correctAnswers,
      explanation: q.explanation,
    });
  });
  return review;
}