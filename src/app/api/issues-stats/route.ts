import { NextRequest, NextResponse } from "next/server";
import { Order } from "@/models/Order";
import { requireAdmin } from "@/lib/adminUsers";

interface HistEntry {
  status: string;
  at: string | Date;
  note?: string;
}

// Thống kê đơn lỗi & đơn trễ trong khoảng ngày — trang "Lỗi & trễ" của Quản lý.
// Tính từ lịch sử đơn nên đơn đã sửa/đã đi tiếp vẫn được đếm đúng thời điểm xảy ra.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Chỉ Quản lý" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const from = new Date(`${sp.get("from")}T00:00:00`);
  const to = new Date(`${sp.get("to")}T00:00:00`);
  to.setDate(to.getDate() + 1);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to)
    return NextResponse.json({ error: "Khoảng ngày không hợp lệ" }, { status: 400 });

  const orders = await Order.find({}, "status statusChangedAt history").lean<
    { status: string; statusChangedAt: Date; history?: HistEntry[] }[]
  >();

  const now = Date.now();
  const LATE_MS = 30 * 60 * 1000;
  let reported = 0, reportedOpen = 0, late = 0, lateOpen = 0;

  for (const o of orders) {
    const h = o.history || [];
    const isActive = o.status !== "cancelled" && o.status !== "da_giao";
    const currentlyOverdue =
      isActive && o.status !== "dong_goi" && now - +new Date(o.statusChangedAt) > LATE_MS;

    // — Đơn lỗi: có lần báo lỗi trong khoảng
    if (h.some((e) => e.note?.startsWith("Báo lỗi") && new Date(e.at) >= from && new Date(e.at) < to)) {
      reported++;
      // còn chưa sửa = entry cuối vẫn là báo lỗi
      const last = h[h.length - 1];
      if (isActive && last?.note?.startsWith("Báo lỗi")) reportedOpen++;
    }

    // — Đơn trễ: có khâu nào đứng yên quá 30p, thời điểm "bắt đầu trễ" rơi vào khoảng
    let wasLate = false;
    for (let i = 0; i < h.length; i++) {
      if (h[i].status === "dong_goi") continue; // "Chờ giao" không tính trễ
      const start = +new Date(h[i].at);
      const end = i + 1 < h.length ? +new Date(h[i + 1].at) : isActive ? now : null;
      if (end === null) continue; // đơn đã kết thúc, khâu cuối không tính chờ
      const lateAt = start + LATE_MS;
      if (end > lateAt && lateAt >= +from && lateAt < +to) {
        wasLate = true;
        break;
      }
    }
    if (wasLate) {
      late++;
      if (currentlyOverdue) lateOpen++;
    }
  }

  return NextResponse.json({
    reported,
    reportedOpen,
    reportedFixed: reported - reportedOpen,
    late,
    lateOpen,
    lateFixed: late - lateOpen,
  });
}
