// Import assignments + questions into MongoDB (idempotent: safe to run repeatedly).
//
//   npm run import                      -> imports data/assignments.json and every data/questions/*.json
//   npm run import -- path/to/file.json -> imports only the given question file(s)
//
// Re-importing a file updates existing questions (matched by questionId), adds new ones and
// removes questions of that assignment that are no longer in the file.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../server/db.js';
import Assignment from '../server/models/Assignment.js';
import Question from '../server/models/Question.js';
import { deriveQuestionType, validateQuestionBank } from '../lib/questionBank.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUESTIONS_PER_ASSIGNMENT = 15;
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

async function main() {
  const args = process.argv.slice(2);
  const meta = readJson(path.join(root, 'data/assignments.json'));
  const files = args.length
    ? args.map((a) => path.resolve(a))
    : fs.readdirSync(path.join(root, 'data/questions')).filter((f) => f.endsWith('.json'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((f) => path.join(root, 'data/questions', f));

  // 1) Validate everything BEFORE touching the database.
  const banks = new Map(); // assignmentId -> questions
  for (const file of files) {
    const raw = readJson(file);
    const errors = validateQuestionBank(raw); // flags ambiguous keys / mismatched type instead of guessing
    const questions = raw.map((q) => ({ ...q, type: deriveQuestionType(q) }));
    if (errors.length) {
      console.error(`\n✖ ${path.basename(file)} is invalid:\n  - ${errors.join('\n  - ')}`);
      process.exit(1);
    }
    for (const q of questions) {
      if (!banks.has(q.assignmentId)) banks.set(q.assignmentId, []);
      banks.get(q.assignmentId).push(q);
    }
  }
  for (const [id, qs] of banks) {
    if (!meta.some((m) => m.assignmentId === id)) {
      console.error(`✖ ${id} is not listed in data/assignments.json`);
      process.exit(1);
    }
    if (qs.length !== QUESTIONS_PER_ASSIGNMENT) {
      console.warn(`⚠ ${id} has ${qs.length} questions (expected ${QUESTIONS_PER_ASSIGNMENT}).`);
    }
  }

  // 2) Write.
  await connectDB();
  await Promise.all([Assignment.syncIndexes(), Question.syncIndexes()]);

  for (const [id, qs] of banks) {
    await Question.bulkWrite(qs.map((q) => ({
      updateOne: { filter: { questionId: q.questionId }, update: { $set: q }, upsert: true },
    })));
    const removed = await Question.deleteMany({ assignmentId: id, questionId: { $nin: qs.map((q) => q.questionId) } });
    console.log(`✔ ${id}: ${qs.length} questions imported${removed.deletedCount ? `, ${removed.deletedCount} removed` : ''}`);
  }

  // 3) Upsert assignment slots; availability follows the number of stored questions.
  for (const m of meta) {
    const count = await Question.countDocuments({ assignmentId: m.assignmentId });
    await Assignment.updateOne(
      { assignmentId: m.assignmentId },
      { $set: { ...m, available: count > 0, totalQuestions: count > 0 ? count : QUESTIONS_PER_ASSIGNMENT } },
      { upsert: true }
    );
  }
  console.log(`✔ ${meta.length} assignment slots synced`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Import failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
