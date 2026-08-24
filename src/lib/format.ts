import { STAGE_SLA_MIN, type OrderStatus } from "@/lib/stages";

export const fmtVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export function isOverdue(o: { status: OrderStatus; statusChangedAt: string }) {
  const sla = STAGE_SLA_MIN[o.status];
  if (!sla) return false;
  return Date.now() - new Date(o.statusChangedAt).getTime() > sla * 60000;
}
