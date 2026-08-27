import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { STATUS_DISPLAY_LABELS, STAGE_COLORS, type OrderStatus } from "@/lib/stages";
import { OrderCard, type OrderLite } from "@/components/OrderBits";
import { fmtVnd } from "@/lib/format";
import {
  TrendingUp,
  PackagePlus,
  PackageCheck,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "cskh") redirect("/orders/new");
  if (user.role !== "admin") redirect("/scan");

  await dbConnect();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [byStatus, todayCreated, todayDelivered, revenueAgg, overdueCount, recent] =
    await Promise.all([
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
      Order.find({ status: { $nin: ["da_giao", "cancelled"] } })
        .sort({ statusChangedAt: 1 })
        .limit(5)
        .lean(),
    ]);

  const counts: Record<string, number> = {};
  for (const s of byStatus) counts[s._id as string] = s.count;
  const pipeline: OrderStatus[] = ["created", "ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao", "cancelled"];

  const stats = [
    { label: "Đơn tạo hôm nay", value: todayCreated, icon: PackagePlus, color: "text-indigo-600 bg-indigo-50" },
    { label: "Giao hôm nay", value: todayDelivered, icon: PackageCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "Đơn trễ (>30p)", value: overdueCount, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "Doanh thu (tổng)", value: fmtVnd(revenueAgg[0]?.total || 0), icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
          Xin chào, {user.name} 👋
        </h1>
        <p className="text-sm text-slate-500">Tổng quan sản xuất hôm nay</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Theo khâu</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {pipeline.map((st) => {
            const c = STAGE_COLORS[st];
            return (
              <Link
                key={st}
                href={`/orders?status=${st}`}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${c.bg} active:scale-[0.98] transition`}
              >
                <span className={`text-sm font-medium ${c.text}`}>{STATUS_DISPLAY_LABELS[st]}</span>
                <span className={`text-sm font-bold ${c.text}`}>{counts[st] || 0}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Đơn chờ xử lý lâu nhất</h2>
          <Link href="/orders" className="text-sm text-indigo-600 font-medium inline-flex items-center">
            Tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-2.5">
          {recent.length === 0 && (
            <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 text-center">
              Không có đơn đang chờ 🎉
            </p>
          )}
          {recent.map((o) => (
            <OrderCard key={String(o._id)} order={JSON.parse(JSON.stringify(o)) as OrderLite} />
          ))}
        </div>
      </div>
    </div>
  );
}
