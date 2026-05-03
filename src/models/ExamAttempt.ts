import mongoose, { Schema, Document } from "mongoose";

export interface IExamAttempt extends Document {
  userId: string;
  exam: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  negativeApplied: number;
  topicAccuracy: { chapter: string; accuracy: number; correct: number; attempted: number }[];
  weakAreas: string[];
  strongAreas: string[];
  topics: string[];
  createdAt: Date;
}

const TopicAccuracySchema = new Schema(
  {
    chapter: { type: String, required: true },
    accuracy: { type: Number, required: true },
    correct: { type: Number, required: true },
    attempted: { type: Number, required: true },
  },
  { _id: false }
);

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    userId: { type: String, required: true, index: true },
    exam: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    correct: { type: Number, required: true },
    wrong: { type: Number, required: true },
    skipped: { type: Number, required: true },
    negativeApplied: { type: Number, required: true },
    topicAccuracy: { type: [TopicAccuracySchema], default: [] },
    weakAreas: { type: [String], default: [] },
    strongAreas: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.models.ExamAttempt || mongoose.model<IExamAttempt>("ExamAttempt", ExamAttemptSchema);
