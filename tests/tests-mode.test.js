import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FULL_TEST_LENGTHS, getAvailableTestLengths, selectRandomQuestions } from '../lib/selection.js';
import { computeResult } from '../lib/scoring.js';
import { buildReview, gradeSubmission } from '../lib/testGrading.js';

const bank = [];
for (let i = 1; i <= 8; i++) {
  bank.push(...JSON.parse(fs.readFileSync(new URL(`../data/questions/assignment-${i}.json`, import.meta.url))));
}

test('test lengths are 30/60/90/120 and all are available with the 120-question bank', () => {
  assert.deepEqual(FULL_TEST_LENGTHS, [30, 60, 90, 120]);
  assert.equal(bank.length, 120);
  assert.ok(getAvailableTestLengths(bank.length).every((o) => o.enabled));
});

test('each test has exactly N unique real questions; 120 contains the whole bank', () => {
  const ids = new Set(bank.map((q) => q.questionId));
  for (const n of FULL_TEST_LENGTHS) {
    const picked = selectRandomQuestions(bank, n);
    assert.equal(picked.length, n);
    assert.equal(new Set(picked.map((q) => q.questionId)).size, n);
    assert.ok(picked.every((q) => ids.has(q.questionId)));
  }
  assert.equal(new Set(selectRandomQuestions(bank, 120).map((q) => q.questionId)).size, 120);
});

test('selection spans assignments and original questions are not mutated', () => {
  const before = JSON.stringify(bank);
  const seen = new Set();
  for (let i = 0; i < 10; i++) selectRandomQuestions(bank, 30).forEach((q) => seen.add(q.assignmentId));
  assert.ok(seen.size >= 6, `expected questions from many assignments, got ${seen.size}`);
  assert.equal(JSON.stringify(bank), before);
});

test('grading: single, multiple (exact match), skipped, and unknown ids', () => {
  const single = bank.find((q) => q.correctAnswers.length === 1);
  const multi = bank.find((q) => q.correctAnswers.length > 2);
  const skipped = bank.find((q) => q !== single && q !== multi);
  const qs = [single, multi, skipped];

  const exact = gradeSubmission(qs, { [single.questionId]: single.correctAnswers, [multi.questionId]: [...multi.correctAnswers].reverse() });
  assert.equal(exact.ok, true);
  assert.deepEqual(exact.answers.map((a) => a.isCorrect), [true, true]);

  const missing = gradeSubmission(qs, { [multi.questionId]: multi.correctAnswers.slice(1) });
  assert.equal(missing.answers[0].isCorrect, false); // missing option
  const extraKey = multi.options.map((o) => o.key).find((k) => !multi.correctAnswers.includes(k));
  if (extraKey) assert.equal(gradeSubmission(qs, { [multi.questionId]: [...multi.correctAnswers, extraKey] }).answers[0].isCorrect, false);

  assert.equal(gradeSubmission(qs, { [skipped.questionId]: [] }).answers.length, 0); // empty = skipped
  assert.equal(gradeSubmission(qs, { 'assignment-1-q99': ['A'] }).ok, false);
  assert.equal(gradeSubmission(qs, { [single.questionId]: ['A', 'B'] }).ok, false); // 2 answers on a single question
  assert.equal(gradeSubmission(qs, { [single.questionId]: ['Z'] }).ok, false);
  assert.equal(gradeSubmission(qs, []).ok, false);
});

test('result + review: accuracy over total, review only has incorrect and skipped', () => {
  const qs = bank.slice(0, 4);
  const wrong = qs[1].options.map((o) => o.key).find((k) => !qs[1].correctAnswers.includes(k));
  const graded = gradeSubmission(qs, { [qs[0].questionId]: qs[0].correctAnswers, [qs[1].questionId]: [wrong] });
  const result = computeResult(qs, graded.answers, { startedAt: new Date(0), submittedAt: new Date(60_000) });
  assert.deepEqual(result, { total: 4, answered: 2, skipped: 2, correct: 1, incorrect: 1, accuracy: 25, timeTakenSeconds: 60 });
  const review = buildReview(qs, graded.answers);
  assert.deepEqual(review.map((r) => [r.number, r.status]), [[2, 'incorrect'], [3, 'skipped'], [4, 'skipped']]);
  assert.ok(!review.some((r) => r.questionId === qs[0].questionId)); // correct answer is not reviewed
  assert.deepEqual(review[0].selected, [wrong]);
  assert.deepEqual(review[1].selected, []);
  assert.ok(review.every((r) => r.explanation && r.correctAnswers.length));
});