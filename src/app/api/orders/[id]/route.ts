import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { getSession } from "@/lib/auth";
import { nextStage, STAGE_LABELS, type OrderStatus } from "@/lib/stages";

async function findOrder(id: string) {
  if (mongoose.isValidObjectId(id)) {
    const byId = await Order.findById(id);
    if (byId) return byId;
  }
  return Order.findOne({ code: id.toUpperCase() });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await dbConnect();
  const { id } = await ctx.params;
  const order = await findOrder(id);
  if (!order) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  return NextResponse.json({ order });
}

// PATCH: { action: "advance" | "cancel" | "update", ... }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await dbConnect();
  const { id } = await ctx.params;
  const order = await findOrder(id);
  if (!order) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  const body = await req.json();
  const action = body.action as string;

  if (action === "advance") {
    if (order.status === "cancelled")
      return NextResponse.json({ error: "Đơn đã bị huỷ, không thể cập nhật" }, { status: 400 });
    const next = nextStage(order.status as OrderStatus);
    if (!next) return NextResponse.json({ error: "Đơn đã hoàn tất (Đã giao)" }, { status: 400 });
    order.status = next;
    order.statusChangedAt = new Date();
    order.history.push({ status: next, at: new Date(), byName: user.name, byId: user.id, note: body.note });
    await order.save();
    return NextResponse.json({ order, message: `Đã chuyển sang khâu "${STAGE_LABELS[next]}"` });
  }

  if (action === "cancel") {
    if (user.role !== "admin")
      return NextResponse.json({ error: "Chỉ admin được huỷ đơn" }, { status: 403 });
    if (order.status === "cancelled")
      return NextResponse.json({ error: "Đơn đã huỷ rồi" }, { status: 400 });
    order.status = "cancelled";
    order.statusChangedAt = new Date();
    order.cancelReason = body.reason || "";
    order.history.push({ status: "cancelled", at: new Date(), byName: user.name, byId: user.id, note: body.reason });
    await order.save();
    return NextResponse.json({ order, message: "Đã huỷ đơn" });
  }

  if (action === "update") {
    if (user.role !== "admin")
      return NextResponse.json({ error: "Chỉ admin được sửa đơn" }, { status: 403 });
    const allowed = ["name", "price", "quantity", "customerName", "note", "imageUrl"] as const;
    for (const k of allowed) if (body[k] !== undefined) (order as Record<string, unknown>)[k] = body[k];
    await order.save();
    return NextResponse.json({ order, message: "Đã cập nhật đơn" });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
}
