import mongoose, { Document, Schema } from "mongoose";

export type FlashcardStatus = "new" | "known" | "revise";

export interface IFlashcardProgress extends Document {
  userId: string;
  setId: string;
  cardId: string;
  status: FlashcardStatus;
  reviewCount: number;
  lastReviewedAt?: Date;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardProgressSchema = new Schema<IFlashcardProgress>(
  {
    userId: { type: String, required: true, index: true },
    setId: { type: String, required: true, index: true },
    cardId: { type: String, required: true, index: true },
    status: { type: String, enum: ["new", "known", "revise"], default: "new" },
    reviewCount: { type: Number, default: 0 },
    lastReviewedAt: { type: Date },
    nextReviewDate: { type: Date },
  },
  { timestamps: true }
);

FlashcardProgressSchema.index({ userId: 1, setId: 1, cardId: 1 }, { unique: true });

export default mongoose.models.FlashcardProgress ||
  mongoose.model<IFlashcardProgress>("FlashcardProgress", FlashcardProgressSchema);
