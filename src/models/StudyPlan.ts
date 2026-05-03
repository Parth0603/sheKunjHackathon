import mongoose, { Schema, Document } from "mongoose";

type PlanTask = {
  subject: string;
  chapter: string;
  type: "REVISION" | "PRACTICE" | "NEW" | "MOCK";
  durationMinutes: number;
  priority: "high" | "medium" | "low";
};

type WeeklyPlan = Record<string, PlanTask[]>;

export interface IStudyPlan extends Document {
  userId: string;
  weeklyPlan: WeeklyPlan;
  insights: string[];
  lastUpdated: Date;
}

const PlanTaskSchema = new Schema<PlanTask>(
  {
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    type: { type: String, enum: ["REVISION", "PRACTICE", "NEW", "MOCK"], required: true },
    durationMinutes: { type: Number, required: true },
    priority: { type: String, enum: ["high", "medium", "low"], required: true },
  },
  { _id: false }
);

const StudyPlanSchema = new Schema<IStudyPlan>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    weeklyPlan: {
      type: Object,
      required: true,
      default: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
    },
    insights: { type: [String], default: [] },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.models.StudyPlan || mongoose.model<IStudyPlan>("StudyPlan", StudyPlanSchema);
