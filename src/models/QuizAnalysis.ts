import mongoose, { Document, Schema } from "mongoose";

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
    level: "Weak" | "Moderate" | "Strong";
    coreIssue: string;
    weakAreas: string[];
    strengths: string[];
    mistakePattern: string;
    timeInsight: string;
    actionPlan: string[];
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
      level: { type: String, enum: ["Weak", "Moderate", "Strong"], default: "Moderate" },
      coreIssue: { type: String, default: "Mixed" },
      weakAreas: { type: [String], default: [] },
      strengths: { type: [String], default: [] },
      mistakePattern: { type: String, default: "" },
      timeInsight: { type: String, default: "" },
      actionPlan: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

export default mongoose.models.QuizAnalysis ||
  mongoose.model<IQuizAnalysis>("QuizAnalysis", QuizAnalysisSchema);
