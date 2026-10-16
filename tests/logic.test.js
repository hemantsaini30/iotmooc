import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildAttemptOrder, selectRandomQuestions, getAvailableTestLengths, shuffle } from '../lib/selection.js';
import { isAnswerCorrect, normalizeSelection, computeResult, toggleSelection } from '../lib/scoring.js';
import { validateQuestionBank, deriveQuestionType } from '../lib/questionBank.js';

const mk = (n) => Array.from({ length: n }, (_, i) => ({
  questionId: `assignment-1-q${String(i + 1).padStart(2, '0')}`, assignmentId: 'assignment-1', questionNumber: i + 1,
  questionText: 'q', options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], correctAnswers: ['A'], explanation: 'e',
}));

test('ordered mode keeps original sequence even if input is unsorted', () => {
  const qs = mk(15).reverse();
  const order = buildAttemptOrder(qs, 'ordered');
  assert.deepEqual(order, mk(15).map((q) => q.questionId));
});

test('random mode contains each question exactly once and differs between attempts', () => {
  const qs = mk(15);
  const a = buildAttemptOrder(qs, 'random');
  const b = buildAttemptOrder(qs, 'random', () => 0.12345);
  assert.equal(new Set(a).size, 15);
  assert.deepEqual([...a].sort(), qs.map((q) => q.questionId).sort());
  let differs = false;
  for (let i = 0; i < 20; i++) if (buildAttemptOrder(qs, 'random').join() !== a.join()) differs = true;
  assert.ok(differs);
  assert.equal(new Set(b).size, 15);
});

test('shuffle does not mutate its input', () => {
  const src = [1, 2, 3, 4, 5];
  shuffle(src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
});

test('duplicate question IDs are rejected when building an order', () => {
  const qs = mk(3); qs[2].questionId = qs[0].questionId;
  assert.throws(() => buildAttemptOrder(qs, 'ordered'));
});

test('full-length selection: unique, right size, throws when pool too small', () => {
  const pool = mk(75);
  const picked = selectRandomQuestions(pool, 60);
  assert.equal(picked.length, 60);
  assert.equal(new Set(picked.map((q) => q.questionId)).size, 60);
  assert.throws(() => selectRandomQuestions(pool, 120));
});

test('full-length options are disabled when the bank is too small', () => {
  const opts = getAvailableTestLengths(75);
  assert.deepEqual(opts.map((o) => o.enabled), [true, false, false]);
  assert.ok(opts[1].message);
  assert.deepEqual(getAvailableTestLengths(225).map((o) => o.enabled), [true, true, true]);
});

test('answer checking: single and multi-select', () => {
  assert.equal(isAnswerCorrect(['B'], ['B']), true);
  assert.equal(isAnswerCorrect(['B'], ['A']), false);
  assert.equal(isAnswerCorrect(['A', 'B', 'D'], ['D', 'A', 'B']), true);
  assert.equal(isAnswerCorrect(['A', 'B', 'D'], ['A', 'B']), false); // partial is not correct
  assert.equal(isAnswerCorrect(['A'], []), false);
});

test('selection validation', () => {
  const single = { ...mk(1)[0], type: 'single' };
  assert.equal(normalizeSelection(single, []).ok, false);
  assert.equal(normalizeSelection(single, ['Z']).ok, false);
  assert.equal(normalizeSelection(single, ['A', 'B']).ok, false);
  assert.deepEqual(normalizeSelection(single, ['A']), { ok: true, value: ['A'] });
  const multi = { ...single, type: 'multiple' };
  assert.deepEqual(normalizeSelection(multi, ['B', 'A', 'A']), { ok: true, value: ['A', 'B'] });
});

test('result calculation never counts skipped as correct', () => {
  const qs = mk(4);
  const r = computeResult(qs, [
    { questionId: qs[0].questionId, selected: ['A'] },
    { questionId: qs[1].questionId, selected: ['B'] },
    { questionId: qs[2].questionId, selected: [] },
  ], { startedAt: new Date(0), submittedAt: new Date(90_000) });
  assert.deepEqual(r, { total: 4, answered: 2, skipped: 2, correct: 1, incorrect: 1, accuracy: 25, timeTakenSeconds: 90 });
});

test('bundled question bank is valid: 8 assignments x 15 questions, unique IDs', () => {
  const all = [];
  for (let i = 1; i <= 8; i++) {
    const qs = JSON.parse(fs.readFileSync(new URL(`../data/questions/assignment-${i}.json`, import.meta.url)));
    assert.equal(qs.length, 15);
    assert.deepEqual(validateQuestionBank(qs), []);
    all.push(...qs);
  }
  assert.equal(new Set(all.map((q) => q.questionId)).size, 120);
});

test('validator catches bad data', () => {
  const bad = mk(2); bad[1].correctAnswers = ['Z']; bad[1].questionId = bad[0].questionId;
  const errs = validateQuestionBank(bad);
  assert.ok(errs.some((e) => e.includes('duplicate questionId')));
  assert.ok(errs.some((e) => e.includes('not an option')));
});

test('type is derived from the answer key, and multiple-correct counts match the source data', () => {
  const expectedMulti = { 1: 4, 2: 6, 3: 0, 4: 1, 5: 0, 6: 0, 7: 0, 8: 0 };
  for (let i = 1; i <= 8; i++) {
    const qs = JSON.parse(fs.readFileSync(new URL(`../data/questions/assignment-${i}.json`, import.meta.url)));
    const multi = qs.filter((q) => deriveQuestionType(q) === 'multiple');
    assert.equal(multi.length, expectedMulti[i], `assignment ${i}`);
    for (const q of qs) assert.equal(deriveQuestionType(q), q.correctAnswers.length > 1 ? 'multiple' : 'single');
  }
});

test('ambiguous or mismatched type is flagged, never guessed', () => {
  const q = { ...mk(1)[0], correctAnswers: [] };
  assert.equal(deriveQuestionType(q), null);
  assert.ok(validateQuestionBank([q]).some((e) => e.includes('FLAGGED FOR REVIEW')));
  const m = { ...mk(1)[0], type: 'multiple' }; // one correct answer but labelled multiple
  assert.ok(validateQuestionBank([m]).some((e) => e.includes('FLAGGED FOR REVIEW')));
});

test('multiple-correct validation: exact set match only (B and D)', () => {
  const c = ['B', 'D'];
  assert.equal(isAnswerCorrect(c, ['B', 'D']), true);
  assert.equal(isAnswerCorrect(c, ['D', 'B']), true);
  assert.equal(isAnswerCorrect(c, ['B']), false);
  assert.equal(isAnswerCorrect(c, ['B', 'C', 'D']), false);
  assert.equal(isAnswerCorrect(c, ['A', 'C']), false);
});

test('selection toggling: single replaces, multiple adds/removes independently', () => {
  assert.deepEqual(toggleSelection(['A'], 'B', false), ['B']);
  assert.deepEqual(toggleSelection(['B'], 'B', false), ['B']);
  assert.deepEqual(toggleSelection([], 'A', true), ['A']);
  assert.deepEqual(toggleSelection(['A'], 'C', true), ['A', 'C']);
  assert.deepEqual(toggleSelection(['A', 'C'], 'A', true), ['C']); // click again deselects
});

test('server-side selection rules: single-correct accepts exactly one, multiple accepts several', () => {
  const base = mk(1)[0];
  base.options = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: key }));
  assert.equal(normalizeSelection({ ...base, type: 'single' }, ['A', 'B']).ok, false);
  assert.equal(normalizeSelection({ ...base, type: 'multiple' }, ['A', 'B']).ok, true);
});
