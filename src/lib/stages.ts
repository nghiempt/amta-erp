export const STAGES = [
  "created",
  "ky_thuat",
  "in",
  "ep",
  "gia_cong",
  "dong_goi",
  "da_giao",
] as const;

export type Stage = (typeof STAGES)[number];
export type OrderStatus = Stage | "cancelled";

export const STAGE_LABELS: Record<OrderStatus, string> = {
  created: "Mới tạo",
  ky_thuat: "Kỹ thuật",
  in: "In",
  ep: "Ép",
  gia_cong: "Gia công",
  dong_goi: "Đóng gói",
  da_giao: "Đã giao",
  cancelled: "Đã huỷ",
};

// minutes expected for each stage before it's considered overdue
export const STAGE_SLA_MIN: Partial<Record<OrderStatus, number>> = {
  created: 30,
  ky_thuat: 30,
  in: 30,
  ep: 30,
  gia_cong: 30,
  dong_goi: 30,
};

export const STAGE_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  created: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  ky_thuat: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  in: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  ep: { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  gia_cong: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  dong_goi: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  da_giao: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

export function nextStage(status: OrderStatus): Stage | null {
  const i = STAGES.indexOf(status as Stage);
  if (i === -1 || i === STAGES.length - 1) return null;
  return STAGES[i + 1];
}
