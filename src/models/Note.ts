import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  userId: string;
  exam: string;
  subject: string;
  chapter: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: String, required: true, index: true },
    exam: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

NoteSchema.index({ userId: 1, chapter: 1 }, { unique: true });

export default mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);
