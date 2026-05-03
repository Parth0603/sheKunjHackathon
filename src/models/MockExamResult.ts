import mongoose, { Schema, Document } from "mongoose";

type TopicPerformance = {
  topic: string;
  accuracy: number;
  correct: number;
  attempted: number;
};

export interface IMockExamResult extends Document {
  userId: string;
  exam: string;
  score: number;
  totalMarks: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  topics: TopicPerformance[];
  timeTaken: number;
  createdAt: Date;
}

const TopicPerformanceSchema = new Schema<TopicPerformance>(
  {
    topic: { type: String, required: true },
    accuracy: { type: Number, required: true },
    correct: { type: Number, required: true },
    attempted: { type: Number, required: true },
  },
  { _id: false }
);

const MockExamResultSchema = new Schema<IMockExamResult>(
  {
    userId: { type: String, required: true, index: true },
    exam: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    wrongAnswers: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    topics: { type: [TopicPerformanceSchema], default: [] },
    timeTaken: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export default mongoose.models.MockExamResult ||
  mongoose.model<IMockExamResult>("MockExamResult", MockExamResultSchema);
