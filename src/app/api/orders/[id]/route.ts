import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { getSession } from "@/lib/auth";
import {
  nextStage,
  STAGES,
  STAGE_LABELS,
  STATUS_DISPLAY_LABELS,
  type OrderStatus,
  type Stage,
} from "@/lib/stages";

// Role theo khâu chỉ được quét đơn đúng khâu của mình
const STAGE_ROLES = new Set<string>(["ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao"]);

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
    // Lấy role mới nhất từ DB — token JWT sống 7 ngày có thể còn ghi role cũ
    const dbUser = await User.findById(user.id).select("role").lean<{ role?: string }>();
    const role = dbUser?.role || user.role;
    if (STAGE_ROLES.has(role) && role !== next) {
      return NextResponse.json(
        {
          error: `Đơn này đang "${STATUS_DISPLAY_LABELS[order.status as OrderStatus]}" — bạn (khâu ${STAGE_LABELS[role as Stage]}) không quét được`,
        },
        { status: 403 }
      );
    }
    order.status = next;
    order.statusChangedAt = new Date();
    order.history.push({ status: next, at: new Date(), byName: user.name, byId: user.id, note: body.note });
    await order.save();
    return NextResponse.json({
      order,
      message: `Khâu ${STAGE_LABELS[next]} đã xong — đơn chuyển sang "${STATUS_DISPLAY_LABELS[next]}"`,
    });
  }

  if (action === "cancel") {
    if (user.role !== "admin" && user.role !== "cskh")
      return NextResponse.json({ error: "Chỉ Quản lý hoặc CSKH được huỷ đơn" }, { status: 403 });
    if (order.status === "cancelled")
      return NextResponse.json({ error: "Đơn đã huỷ rồi" }, { status: 400 });
    order.status = "cancelled";
    order.statusChangedAt = new Date();
    order.cancelReason = body.reason || "";
    order.history.push({ status: "cancelled", at: new Date(), byName: user.name, byId: user.id, note: body.reason });
    await order.save();
    return NextResponse.json({ order, message: "Đã huỷ đơn" });
  }

  // Báo lỗi sản xuất: chuyển đơn về làm lại từ khâu targetStage.
  // Không xoá lịch sử cũ — ghi tiếp entry mới để quản lý biết ai làm ở mỗi lượt.
  if (action === "rework") {
    if (order.status === "cancelled")
      return NextResponse.json({ error: "Đơn đã bị huỷ, không thể cập nhật" }, { status: 400 });
    const target = body.targetStage as Stage;
    const idx = STAGES.indexOf(target);
    if (idx < 0 || target === "da_giao")
      return NextResponse.json({ error: "Khâu làm lại không hợp lệ" }, { status: 400 });
    // status = khâu ngay trước target → đơn hiển thị "Chờ <target>".
    // target = created: báo về CSKH sửa lại đơn, status giữ "created" (Chờ Kỹ thuật)
    const revertTo = STAGES[Math.max(0, idx - 1)];
    const targetLabel = target === "created" ? "CSKH" : STAGE_LABELS[target];
    order.status = revertTo;
    order.statusChangedAt = new Date();
    order.history.push({
      status: revertTo,
      at: new Date(),
      byName: user.name,
      byId: user.id,
      note: `Báo lỗi: ${body.reason || "không rõ"} — làm lại từ khâu ${targetLabel}`,
    });
    await order.save();
    return NextResponse.json({ order, message: `Đã chuyển đơn về làm lại từ khâu "${targetLabel}"` });
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
