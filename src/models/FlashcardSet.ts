import mongoose, { Document, Schema } from "mongoose";

export type FlashcardDifficulty = "easy" | "medium" | "hard";

export type FlashcardItem = {
  cardId: string;
  question: string;
  answer: string;
  explanation?: string;
  example?: string;
  subject?: string;
  topic?: string;
  difficulty: FlashcardDifficulty;
  tip?: string;
};

export interface IFlashcardSet extends Document {
  userId: string;
  exam: string;
  subject: string;
  chapter: string;
  topic?: string;
  count: number;
  sourceKey: string;
  cards: FlashcardItem[];
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardItemSchema = new Schema<FlashcardItem>(
  {
    cardId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    explanation: { type: String, default: "" },
    example: { type: String, default: "" },
    subject: { type: String, default: "" },
    topic: { type: String, default: "" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    tip: { type: String },
  },
  { _id: false }
);

const FlashcardSetSchema = new Schema<IFlashcardSet>(
  {
    userId: { type: String, required: true, index: true },
    exam: { type: String, required: true, index: true },
    subject: { type: String, required: true, index: true },
    chapter: { type: String, required: true, index: true },
    topic: { type: String, default: "" },
    count: { type: Number, required: true },
    sourceKey: { type: String, required: true, index: true },
    cards: { type: [FlashcardItemSchema], default: [] },
  },
  { timestamps: true }
);

FlashcardSetSchema.index({ userId: 1, sourceKey: 1 }, { unique: true });

export default mongoose.models.FlashcardSet ||
  mongoose.model<IFlashcardSet>("FlashcardSet", FlashcardSetSchema);
