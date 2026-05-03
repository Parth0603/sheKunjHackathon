import mongoose, { Schema, Document } from "mongoose";

type TutorMessage = {
  role: "user" | "ai";
  content: string;
  createdAt: Date;
};

export interface ITutorChat extends Document {
  userId: string;
  exam: string;
  subject: string;
  chapter: string;
  messages: TutorMessage[];
  updatedAt: Date;
}

const TutorMessageSchema = new Schema<TutorMessage>(
  {
    role: { type: String, enum: ["user", "ai"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TutorChatSchema = new Schema<ITutorChat>(
  {
    userId: { type: String, required: true, index: true },
    exam: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    messages: { type: [TutorMessageSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

TutorChatSchema.index({ userId: 1, exam: 1, subject: 1, chapter: 1 }, { unique: true });

export default mongoose.models.TutorChat || mongoose.model<ITutorChat>("TutorChat", TutorChatSchema);
