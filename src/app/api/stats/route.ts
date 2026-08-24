import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Chỉ admin" }, { status: 403 });
  await dbConnect();

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
