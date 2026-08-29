import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderCard, type OrderLite } from "@/components/OrderBits";
import RangeStats from "@/components/RangeStats";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "cskh") redirect("/orders/new");
  if (user.role !== "admin") redirect("/scan");

  await dbConnect();
  const recent = await Order.find({ status: { $nin: ["da_giao", "cancelled"] } })
    .sort({ statusChangedAt: 1 })
    .limit(5)
    .lean();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
          Xin chào, {user.name} 👋
        </h1>
        <p className="text-sm text-slate-500">Tổng quan sản xuất</p>
      </div>

      {/* Section duy nhất: filter thời gian + 4 chỉ số + số đơn theo khâu */}
      <RangeStats />

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
