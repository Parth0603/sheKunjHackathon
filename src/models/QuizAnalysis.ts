import mongoose, { Document, Schema } from "mongoose";

type Difficulty = "easy" | "medium" | "hard";

export interface IQuizAnalysis extends Document {
  userId: string;
  attemptKey: string;
  exam: string;
  subject: string;
  chapter: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  accuracy: number;
  timeTaken: number;
  analysis: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    mistakePatterns: string[];
    timeAnalysis: string;
    difficultyBreakdown: Record<Difficulty, string>;
    actionablePlan: string[];
    nextQuizStrategy: string;
    confidenceScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const QuizAnalysisSchema = new Schema<IQuizAnalysis>(
  {
    userId: { type: String, required: true, index: true },
    attemptKey: { type: String, required: true, index: true, unique: true },
    exam: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    totalQuestions: { type: Number, required: true },
    correct: { type: Number, required: true },
    wrong: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
    analysis: {
      summary: { type: String, default: "" },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      mistakePatterns: { type: [String], default: [] },
      timeAnalysis: { type: String, default: "" },
      difficultyBreakdown: {
        easy: { type: String, default: "" },
        medium: { type: String, default: "" },
        hard: { type: String, default: "" },
      },
      actionablePlan: { type: [String], default: [] },
      nextQuizStrategy: { type: String, default: "" },
      confidenceScore: { type: Number, default: 50 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.QuizAnalysis ||
  mongoose.model<IQuizAnalysis>("QuizAnalysis", QuizAnalysisSchema);

