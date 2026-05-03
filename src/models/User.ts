import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  credits: number;
  badges: string[];
  ownedRewards: string[];
  creditHistory: {
    reason: string;
    delta: number;
    createdAt: Date;
  }[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String },
  credits: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  ownedRewards: { type: [String], default: [] },
  creditHistory: {
    type: [
      {
        reason: { type: String, required: true },
        delta: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
