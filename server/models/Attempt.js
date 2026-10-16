import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selected: { type: [String], required: true },
    isCorrect: { type: Boolean, required: true },
    checkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema({
  mode: { type: String, enum: ['practice', 'full'], default: 'practice' }, // 'full' is reserved for the future mode
  assignmentId: { type: String, default: null },
  orderMode: { type: String, enum: ['ordered', 'random'], default: 'ordered' },
  questionIds: { type: [String], required: true }, // fixed order for the whole attempt
  answers: { type: [answerSchema], default: [] },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
});
attemptSchema.index({ startedAt: 1 });

export default mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
