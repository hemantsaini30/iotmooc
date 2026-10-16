import { deriveQuestionType } from '../lib/questionBank.js';

// Shapes of data sent to the client. Correct answers are only included for questions
// the attempt has already checked.

export function publicQuestion(q) {
  return {
    questionId: q.questionId,
    questionNumber: q.questionNumber,
    questionText: q.questionText,
    options: q.options.map((o) => ({ key: o.key, text: o.text })),
    type: deriveQuestionType(q), // derived from the answer key, never from wording
  };
}

export function buildAttemptView(attempt, assignment, orderedQuestions) {
  const byId = new Map(orderedQuestions.map((q) => [q.questionId, q]));
  const checks = {};
  for (const a of attempt.answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    checks[a.questionId] = {
      selected: a.selected,
      isCorrect: a.isCorrect,
      correctAnswers: q.correctAnswers,
      explanation: q.explanation,
    };
  }
  return {
    attemptId: String(attempt._id),
    mode: attempt.mode,
    orderMode: attempt.orderMode,
    assignment: assignment
      ? { assignmentId: assignment.assignmentId, number: assignment.number, title: assignment.title }
      : null,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    total: orderedQuestions.length,
    questions: orderedQuestions.map(publicQuestion),
    checks,
    result: attempt.result || null,
  };
}
