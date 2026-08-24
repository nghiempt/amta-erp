import mongoose, { Schema, model, models } from "mongoose";
import type { OrderStatus } from "@/lib/stages";

export interface IHistoryEntry {
  status: OrderStatus;
  at: Date;
  byName: string;
  byId?: mongoose.Types.ObjectId;
  note?: string;
}

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  code: string; // internal AMTA code, encoded in QR
  source: "tiktok" | "shopee" | "other";
  sourceOrderId: string; // barcode / order id from platform
  name: string;
  price: number;
  quantity: number;
  customerName?: string;
  note?: string;
  imageUrl?: string;
  status: OrderStatus;
  statusChangedAt: Date;
  history: IHistoryEntry[];
  cancelReason?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HistorySchema = new Schema<IHistoryEntry>(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    byName: { type: String, required: true },
    byId: { type: Schema.Types.ObjectId, ref: "User" },
    note: String,
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    source: { type: String, enum: ["tiktok", "shopee", "other"], required: true },
    sourceOrderId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    customerName: String,
    note: String,
    imageUrl: String,
    status: {
      type: String,
      enum: ["created", "ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao", "cancelled"],
      default: "created",
      index: true,
    },
    statusChangedAt: { type: Date, default: Date.now },
    history: [HistorySchema],
    cancelReason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: String,
  },
  { timestamps: true }
);

OrderSchema.index({ name: "text", sourceOrderId: "text", customerName: "text" });
OrderSchema.index({ createdAt: -1 });

export const Order = models.Order || model<IOrder>("Order", OrderSchema);
