// Answer checking and result calculation. Single source of truth (used by the server).

/** Set equality between the correct keys and the selected keys. */
export function isAnswerCorrect(correctAnswers, selected) {
  if (!Array.isArray(correctAnswers) || !Array.isArray(selected)) return false;
  const c = new Set(correctAnswers);
  const s = new Set(selected);
  return c.size === s.size && [...c].every((k) => s.has(k));
}

/**
 * Next selection after the user clicks `key`.
 * single: replaces the selection. multiple: adds/removes the key independently.
 */
export function toggleSelection(current, key, multiple) {
  if (!multiple) return [key];
  return current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
}

/**
 * Validate a client-supplied selection against a question.
 * Returns { ok: true, value: [keys] } or { ok: false, error }.
 */
export function normalizeSelection(question, selected) {
  if (!Array.isArray(selected) || selected.length === 0) {
    return { ok: false, error: 'Select an option before checking.' };
  }
  if (!selected.every((k) => typeof k === 'string')) return { ok: false, error: 'Invalid selection.' };
  const valid = new Set(question.options.map((o) => o.key));
  const value = [...new Set(selected)];
  if (!value.every((k) => valid.has(k))) return { ok: false, error: 'Selection contains an unknown option.' };
  if (question.type !== 'multiple' && value.length !== 1) {
    return { ok: false, error: 'Select exactly one option.' };
  }
  return { ok: true, value: value.sort() };
}

/**
 * Compute the result summary.
 * `answers` is a list of { questionId, selected }. Unanswered questions count as skipped,
 * never as correct.
 */
export function computeResult(questions, answers, { startedAt, submittedAt } = {}) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  for (const q of questions) {
    const a = byId.get(q.questionId);
    if (!a || !a.selected || a.selected.length === 0) skipped++;
    else if (isAnswerCorrect(q.correctAnswers, a.selected)) correct++;
    else incorrect++;
  }
  const total = questions.length;
  const answered = correct + incorrect;
  const timeTakenSeconds =
    startedAt && submittedAt
      ? Math.max(0, Math.round((new Date(submittedAt) - new Date(startedAt)) / 1000))
      : null;
  return {
    total,
    answered,
    skipped,
    correct,
    incorrect,
    accuracy: total ? Math.round((correct / total) * 1000) / 10 : 0,
    timeTakenSeconds,
  };
}
