import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  { key: { type: String, required: true }, text: { type: String, required: true } },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, unique: true }, // stable ID, e.g. "assignment-1-q07"
    assignmentId: { type: String, required: true, index: true },
    questionNumber: { type: Number, required: true }, // original number within the assignment
    questionText: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    correctAnswers: { type: [String], required: true }, // option keys; >1 means multi-select (MSQ)
    type: { type: String, enum: ['single', 'multiple'], default: 'single' },
    explanation: { type: String, required: true },
  },
  { timestamps: true }
);
questionSchema.index({ assignmentId: 1, questionNumber: 1 }, { unique: true });

export default mongoose.models.Question || mongoose.model('Question', questionSchema);
