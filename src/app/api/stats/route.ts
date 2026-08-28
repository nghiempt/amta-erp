import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Chỉ admin" }, { status: 403 });
  await dbConnect();

  // ?from=YYYY-MM-DD&to=YYYY-MM-DD → số liệu trong khoảng [from 00:00, to 24:00)
  const sp = req.nextUrl.searchParams;
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  if (fromStr && toStr) {
    const from = new Date(`${fromStr}T00:00:00`);
    const to = new Date(`${toStr}T00:00:00`);
    to.setDate(to.getDate() + 1); // inclusive hết ngày "to"
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to)
      return NextResponse.json({ error: "Khoảng ngày không hợp lệ" }, { status: 400 });
    const range = { $gte: from, $lt: to };
    const [created, dongGoi, choGiao, daGiao] = await Promise.all([
      Order.countDocuments({ createdAt: range }),
      // đã đóng gói xong trong khoảng (dựa vào lịch sử, kể cả đơn đã đi tiếp khâu sau)
      Order.countDocuments({ history: { $elemMatch: { status: "dong_goi", at: range } } }),
      // đang chờ giao, vào trạng thái đó trong khoảng
      Order.countDocuments({ status: "dong_goi", statusChangedAt: range }),
      Order.countDocuments({ history: { $elemMatch: { status: "da_giao", at: range } } }),
    ]);
    return NextResponse.json({ created, dongGoi, choGiao, daGiao });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [byStatus, todayCreated, todayDelivered, revenueAgg, overdue] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.countDocuments({ createdAt: { $gte: startOfDay } }),
    Order.countDocuments({ status: "da_giao", statusChangedAt: { $gte: startOfDay } }),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: { $multiply: ["$price", "$quantity"] } } } },
    ]),
    Order.countDocuments({
      status: { $nin: ["da_giao", "cancelled"] },
      statusChangedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const s of byStatus) statusCounts[s._id] = s.count;

  return NextResponse.json({
    statusCounts,
    todayCreated,
    todayDelivered,
    revenue: revenueAgg[0]?.total || 0,
    overdue,
  });
}
