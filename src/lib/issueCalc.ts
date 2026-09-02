// Phân loại đơn lỗi / đơn trễ theo khoảng thời gian — dùng chung cho
// trang "Lỗi & trễ" và các filter nhảy từ dashboard sang tab Đơn hàng,
// để con số trên dashboard và danh sách đơn luôn khớp nhau.

export const LATE_MS = 30 * 60 * 1000;

export interface IssueHist {
  status: string;
  at: string | Date;
  note?: string;
}

export interface IssueOrder {
  status: string;
  statusChangedAt: string | Date;
  history?: IssueHist[];
}

export interface IssueFlags {
  reported: boolean; // có lần báo lỗi trong khoảng
  reportedOpen: boolean; // hiện vẫn đang treo báo lỗi chưa sửa
  wasLate: boolean; // có khâu đứng quá 30p, thời điểm bắt đầu trễ trong khoảng
  currentlyOverdue: boolean; // hiện tại vẫn đang trễ
}

export function classifyIssues(o: IssueOrder, from: Date, to: Date, now = Date.now()): IssueFlags {
  const h = o.history || [];
  const isActive = o.status !== "cancelled" && o.status !== "da_giao";
  const currentlyOverdue =
    isActive && o.status !== "dong_goi" && now - +new Date(o.statusChangedAt) > LATE_MS;

  const reported = h.some(
    (e) => e.note?.startsWith("Báo lỗi") && new Date(e.at) >= from && new Date(e.at) < to
  );
  const last = h[h.length - 1];
  const reportedOpen = reported && isActive && !!last?.note?.startsWith("Báo lỗi");

  let wasLate = false;
  for (let i = 0; i < h.length; i++) {
    if (h[i].status === "dong_goi") continue; // "Chờ giao" không tính trễ
    const start = +new Date(h[i].at);
    const end = i + 1 < h.length ? +new Date(h[i + 1].at) : isActive ? now : null;
    if (end === null) continue; // đơn đã kết thúc, khâu cuối không tính chờ
    const lateAt = start + LATE_MS;
    if (end > lateAt && lateAt >= +from && lateAt < +to) {
      wasLate = true;
      break;
    }
  }

  return { reported, reportedOpen, wasLate, currentlyOverdue };
}
