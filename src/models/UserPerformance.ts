import mongoose, { Schema, Document } from "mongoose";

export interface IUserPerformance extends Document {
  userId: string;
  exam: string;
  subject: string;
  chapter: string;
  accuracy: number;
  attempts: number;
  lastAttempt: Date;
  history: number[];
  lastScore: number;
  trend: "Improving" | "Declining" | "Stable";
  type?: "quiz" | "mock";
  chapterMistakes?: Record<string, number>;
  difficultyStats?: {
    easy: { attempted: number; correct: number };
    medium: { attempted: number; correct: number };
    hard: { attempted: number; correct: number };
  };
}

const UserPerformanceSchema = new Schema<IUserPerformance>(
  {
    userId: { type: String, required: true },
    exam: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    accuracy: { type: Number, required: true },
    attempts: { type: Number, required: true, default: 1 },
    lastAttempt: { type: Date, default: Date.now },
    history: { type: [Number], default: [] },
    lastScore: { type: Number, default: 0 },
    trend: { type: String, enum: ["Improving", "Declining", "Stable"], default: "Stable" },
    type: { type: String, enum: ["quiz", "mock"] },
    chapterMistakes: { type: Schema.Types.Mixed, default: {} },
    difficultyStats: {
      easy: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
      },
      medium: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
      },
      hard: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.UserPerformance ||
  mongoose.model<IUserPerformance>("UserPerformance", UserPerformanceSchema);
