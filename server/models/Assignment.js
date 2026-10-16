import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true, unique: true }, // e.g. "assignment-3"
    number: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    available: { type: Boolean, default: false }, // true once questions have been imported
    totalQuestions: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export default mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
