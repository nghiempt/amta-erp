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
    const [created, revenueAgg, overdue, reported, byStatus] = await Promise.all([
      Order.countDocuments({ createdAt: range }),
      // doanh thu: tổng tiền các đơn tạo trong khoảng (không tính đơn huỷ)
      Order.aggregate([
        { $match: { createdAt: range, status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: { $multiply: ["$price", "$quantity"] } } } },
      ]),
      // đơn trễ: số liệu hiện tại (không phụ thuộc khoảng ngày)
      Order.countDocuments({
        status: { $nin: ["da_giao", "cancelled", "dong_goi"] },
        statusChangedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
      }),
      // đơn lỗi: có ít nhất 1 lần báo lỗi trong khoảng — cộng dồn kể cả đã sửa xong
      // (thống kê hiệu quả hoạt động, khác với filter "đang báo lỗi" ở tab Đơn hàng)
      Order.countDocuments({ history: { $elemMatch: { at: range, note: /^Báo lỗi/ } } }),
      // mỗi khâu đã quét xong bao nhiêu đơn trong khoảng (đếm đơn, không đếm lượt;
      // loại entry báo lỗi và entry đánh dấu bỏ qua khâu — không phải lượt làm thật)
      Order.aggregate([
        { $unwind: "$history" },
        {
          $match: {
            "history.at": range,
            $or: [
              { "history.note": { $exists: false } },
              { "history.note": { $not: /^(Báo lỗi|Bỏ qua)/ } },
            ],
          },
        },
        { $group: { _id: { stage: "$history.status", order: "$_id" } } },
        { $group: { _id: "$_id.stage", count: { $sum: 1 } } },
      ]),
    ]);
    const stageDone: Record<string, number> = {};
    for (const s of byStatus) stageDone[s._id] = s.count;
    return NextResponse.json({
      created,
      revenue: revenueAgg[0]?.total || 0,
      overdue,
      reported,
      stageDone,
    });
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
      status: { $nin: ["da_giao", "cancelled", "dong_goi"] },
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
