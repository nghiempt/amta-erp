import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  passwordHash: string;
  name: string;
  role: string; // admin | cskh | staff | <stage>: ky_thuat, in, ep, gia_cong, dong_goi, da_giao
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "staff", "cskh", "ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao"],
      default: "staff",
    },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
