import { NextRequest, NextResponse } from "next/server";
import { Order } from "@/models/Order";
import { requireAdmin } from "@/lib/adminUsers";
import { classifyIssues, type IssueOrder } from "@/lib/issueCalc";

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

  const orders = await Order.find({}, "status statusChangedAt history").lean<IssueOrder[]>();

  const now = Date.now();
  let reported = 0, reportedOpen = 0, late = 0, lateOpen = 0;
  for (const o of orders) {
    const f = classifyIssues(o, from, to, now);
    if (f.reported) {
      reported++;
      if (f.reportedOpen) reportedOpen++;
    }
    if (f.wasLate) {
      late++;
      if (f.currentlyOverdue) lateOpen++;
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
