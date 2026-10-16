// Validation for question-bank JSON used by the import script and the tests.
const ASSIGNMENT_RE = /^assignment-\d{1,3}$/;
const QUESTION_RE = /^assignment-\d{1,3}-q\d{2,3}$/;

export const isValidAssignmentId = (v) => typeof v === 'string' && ASSIGNMENT_RE.test(v);
export const isValidQuestionId = (v) => typeof v === 'string' && QUESTION_RE.test(v);

/**
 * Question type is ALWAYS derived from the answer key: 1 correct answer -> 'single',
 * more than one -> 'multiple'. Returns null if the key is unusable (caller must flag it).
 */
export function deriveQuestionType(question) {
  const c = question?.correctAnswers;
  if (!Array.isArray(c) || c.length === 0 || new Set(c).size !== c.length) return null;
  return c.length === 1 ? 'single' : 'multiple';
}

/** Returns an array of human-readable error strings (empty = valid). */
export function validateQuestionBank(questions) {
  const errors = [];
  const ids = new Set();
  const numbers = new Set();
  if (!Array.isArray(questions)) return ['Question bank must be a JSON array.'];
  questions.forEach((q, i) => {
    const where = `#${i + 1} (${q?.questionId ?? 'no id'})`;
    if (!isValidQuestionId(q.questionId)) errors.push(`${where}: invalid questionId`);
    if (!isValidAssignmentId(q.assignmentId)) errors.push(`${where}: invalid assignmentId`);
    if (q.questionId && !String(q.questionId).startsWith(`${q.assignmentId}-q`)) {
      errors.push(`${where}: questionId must start with "${q.assignmentId}-q"`);
    }
    if (ids.has(q.questionId)) errors.push(`${where}: duplicate questionId`);
    ids.add(q.questionId);
    const nKey = `${q.assignmentId}:${q.questionNumber}`;
    if (!Number.isInteger(q.questionNumber) || q.questionNumber < 1) errors.push(`${where}: invalid questionNumber`);
    if (numbers.has(nKey)) errors.push(`${where}: duplicate questionNumber`);
    numbers.add(nKey);
    if (q.type !== undefined && q.type !== deriveQuestionType(q)) {
      errors.push(`${where}: FLAGGED FOR REVIEW - type "${q.type}" does not match the answer key`);
    }
    if (deriveQuestionType(q) === null) errors.push(`${where}: FLAGGED FOR REVIEW - answer key is ambiguous or unparsable`);
    if (!q.questionText || typeof q.questionText !== 'string') errors.push(`${where}: missing questionText`);
    if (!q.explanation || typeof q.explanation !== 'string') errors.push(`${where}: missing explanation`);
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`${where}: needs at least 2 options`);
      return;
    }
    const keys = q.options.map((o) => o.key);
    if (new Set(keys).size !== keys.length) errors.push(`${where}: duplicate option keys`);
    if (q.options.some((o) => !o.key || !o.text)) errors.push(`${where}: option missing key or text`);
    if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
      errors.push(`${where}: correctAnswers must be a non-empty array`);
    } else if (!q.correctAnswers.every((k) => keys.includes(k))) {
      errors.push(`${where}: correctAnswers contains a key that is not an option`);
    }
  });
  return errors;
}
