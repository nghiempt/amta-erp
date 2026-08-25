import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  passwordHash: string;
  name: string;
  role: "admin" | "staff" | "cskh";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "staff", "cskh"], default: "staff" },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
