"use client";

import Link from "next/link";
import { STAGE_LABELS, STAGE_COLORS, type OrderStatus } from "@/lib/stages";
import { Clock, AlertTriangle } from "lucide-react";

export interface OrderLite {
  _id: string;
  code: string;
  source: "tiktok" | "shopee" | "other";
  sourceOrderId: string;
  name: string;
  price: number;
  quantity: number;
  customerName?: string;
  status: OrderStatus;
  statusChangedAt: string;
  createdAt: string;
}

export { fmtVnd, timeAgo, isOverdue } from "@/lib/format";
import { fmtVnd, timeAgo, isOverdue } from "@/lib/format";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STAGE_COLORS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {STAGE_LABELS[status]}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    tiktok: "bg-slate-900 text-white",
    shopee: "bg-orange-500 text-white",
    other: "bg-slate-200 text-slate-700",
  };
  const label: Record<string, string> = { tiktok: "TikTok", shopee: "Shopee", other: "Khác" };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${map[source]}`}>
      {label[source] || source}
    </span>
  );
}

export function OrderCard({ order }: { order: OrderLite }) {
  const overdue = isOverdue(order);
  return (
    <Link
      href={`/orders/${order._id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-4 active:scale-[0.99] hover:border-indigo-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SourceBadge source={order.source} />
            <span className="text-xs font-mono text-slate-500 truncate">{order.code}</span>
          </div>
          <p className="font-semibold text-slate-900 truncate">{order.name}</p>
          <p className="text-sm text-slate-500 truncate">
            {order.customerName ? `${order.customerName} · ` : ""}
            {fmtVnd(order.price)} × {order.quantity}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {timeAgo(order.statusChangedAt)}
        </span>
        {overdue && (
          <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> Quá 30 phút
          </span>
        )}
      </div>
    </Link>
  );
}
