export const STAGES = [
  "cho_cskh", // đơn bị báo lỗi đá về CSKH sửa lại — không nằm trong luồng tạo đơn mặc định
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
  cho_cskh: "CSKH sửa đơn",
  created: "CSKH",
  ky_thuat: "Kỹ thuật",
  in: "In",
  ep: "Ép",
  gia_cong: "Gia công",
  dong_goi: "Đóng gói",
  da_giao: "Đã giao",
  cancelled: "Đã huỷ",
};

// Nhãn hiển thị theo "ai cần làm tiếp" — status X nghĩa là khâu X đã quét xong,
// nên đơn đang chờ khâu kế tiếp xử lý
export const STATUS_DISPLAY_LABELS: Record<OrderStatus, string> = {
  cho_cskh: "Chờ CSKH",
  created: "Chờ Kỹ thuật",
  ky_thuat: "Chờ In",
  in: "Chờ Ép",
  ep: "Chờ Gia công",
  gia_cong: "Chờ Đóng gói",
  dong_goi: "Chờ giao",
  da_giao: "Đã giao",
  cancelled: "Đã huỷ",
};

// minutes expected for each stage before it's considered overdue
export const STAGE_SLA_MIN: Partial<Record<OrderStatus, number>> = {
  cho_cskh: 30,
  created: 30,
  ky_thuat: 30,
  in: 30,
  ep: 30,
  gia_cong: 30,
  // dong_goi (Chờ giao) không tính trễ — giao hàng phụ thuộc lịch lấy hàng bên ngoài
};

export const STAGE_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  cho_cskh: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  created: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  ky_thuat: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  in: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  ep: { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  gia_cong: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  dong_goi: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  da_giao: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

// Các role gắn với 1 khâu — chỉ được quét / báo lỗi đơn đang chờ đúng khâu mình
export const STAGE_ROLES = new Set<string>(["ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao"]);

// Các trạng thái có thể đá đơn về khi báo lỗi (không đá về da_giao/dong_goi-hoàn tất)
export const REVERTABLE_STATUSES: Stage[] = ["cho_cskh", "created", "ky_thuat", "in", "ep", "gia_cong"];

// Báo lỗi chỉ được đá về các trạng thái ĐỨNG TRƯỚC trạng thái hiện tại
export function revertOptions(status: OrderStatus): Stage[] {
  const i = STAGES.indexOf(status as Stage);
  if (i < 0) return []; // cancelled
  return REVERTABLE_STATUSES.filter((s) => STAGES.indexOf(s) < i);
}

// Role có được thao tác (quét / báo lỗi / xác nhận sửa) đơn này không?
// Role nào chỉ đụng được đơn đang chờ đúng khâu mình — kể cả CSKH (chỉ đơn "Chờ CSKH")
export function canActOnOrder(role: string, status: OrderStatus): boolean {
  // CSKH: đơn "Chờ CSKH" (sửa lỗi) + đơn "Chờ giao" (CSKH quét xác nhận giao)
  if (role === "cskh") return status === "cho_cskh" || status === "dong_goi";
  if (!STAGE_ROLES.has(role)) return true; // admin, staff chung
  return nextStage(status) === role;
}

export function roleLabel(role: string): string {
  if (role === "cskh") return "CSKH";
  return STAGE_LABELS[role as Stage] || role;
}

// Các trạng thái mà lúc quét được phép "bỏ qua khâu kế tiếp" (tuỳ sản phẩm):
// - "Chờ In" (ky_thuat): In xong có thể bỏ qua Ép → "Chờ Gia công"
// - "Chờ Ép" (in): Ép xong có thể bỏ qua Gia công → "Chờ Đóng gói"
export const SKIPPABLE_STATUSES = new Set<OrderStatus>(["ky_thuat", "in"]);

export function nextStage(status: OrderStatus): Stage | null {
  const i = STAGES.indexOf(status as Stage);
  if (i === -1 || i === STAGES.length - 1) return null;
  return STAGES[i + 1];
}
