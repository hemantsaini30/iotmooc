// Question ordering / selection logic. Pure functions, no I/O, easy to test.

/** Fisher-Yates shuffle. Returns a NEW array; never mutates the input. */
export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Original sequence (sorted by questionNumber). */
export function orderQuestions(questions) {
  return [...questions].sort((a, b) => a.questionNumber - b.questionNumber);
}

/**
 * Build the question order for an assignment attempt.
 * mode: 'ordered' | 'random'. Returns an array of questionIds, each exactly once.
 */
export function buildAttemptOrder(questions, mode, rng = Math.random) {
  const ids = orderQuestions(questions).map((q) => q.questionId);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate question IDs in question bank');
  return mode === 'random' ? shuffle(ids, rng) : ids;
}

// ---- Random multi-assignment tests (/tests page) ----
export const FULL_TEST_LENGTHS = [30, 60, 90, 120];

/** Pick `count` unique random questions from the pool. Throws if the pool is too small. */
export function selectRandomQuestions(pool, count, rng = Math.random) {
  const unique = [...new Map(pool.map((q) => [q.questionId, q])).values()];
  if (!Number.isInteger(count) || count <= 0) throw new Error('count must be a positive integer');
  if (unique.length < count) {
    throw new Error(`Only ${unique.length} questions available; ${count} requested`);
  }
  return shuffle(unique, rng).slice(0, count); // shuffled => count === pool size returns the whole pool, randomised
}

/** Which full-length options can be offered for a given pool size. */
export function getAvailableTestLengths(poolSize, lengths = FULL_TEST_LENGTHS) {
  return lengths.map((length) => ({
    length,
    enabled: poolSize >= length,
    message:
      poolSize >= length ? null : `Needs ${length} questions; only ${poolSize} available right now.`,
  }));
}