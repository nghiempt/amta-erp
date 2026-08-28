"use client";

import { useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import {
  STATUS_DISPLAY_LABELS,
  STAGE_COLORS,
  revertOptions,
  canActOnOrder,
  type OrderStatus,
  type Stage,
} from "@/lib/stages";
import { Clock, AlertTriangle, Printer, X, Loader2 } from "lucide-react";

export interface OrderLite {
  _id: string;
  code: string;
  source: "tiktok" | "shopee" | "other";
  sourceOrderId: string;
  name: string;
  price: number;
  quantity: number;
  customerName?: string;
  note?: string;
  status: OrderStatus;
  statusChangedAt: string;
  createdAt: string;
  history?: { status: OrderStatus; byName: string; at?: string; note?: string }[];
}

const fmtShortTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : "";

// Ai làm khâu nào — entry history status X = người đã quét/thực hiện khâu X
const HISTORY_ROLE_LABELS: Record<OrderStatus, string> = {
  cho_cskh: "CSKH",
  created: "CSKH",
  ky_thuat: "Kỹ thuật",
  in: "In",
  ep: "Ép",
  gia_cong: "Gia công",
  dong_goi: "Đóng gói",
  da_giao: "Giao",
  cancelled: "Huỷ",
};

export { fmtVnd, timeAgo, isOverdue } from "@/lib/format";
import { fmtVnd, timeAgo, isOverdue } from "@/lib/format";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STAGE_COLORS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {STATUS_DISPLAY_LABELS[status]}
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

const SOURCE_NAMES: Record<string, string> = { tiktok: "TikTok", shopee: "Shopee", other: "Khác" };

// Popup in lại phiếu đơn (backup khi tạo đơn trên điện thoại, in trên máy tính)
// TikTok: kèm barcode gốc đã quét; luôn kèm QR mã nội bộ
function ReprintModal({
  order,
  qr,
  barcode,
  onClose,
}: {
  order: OrderLite;
  qr: string;
  barcode: string | null;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const sourceName = SOURCE_NAMES[order.source] || order.source;

  function printTicket() {
    const w = window.open("", "_blank");
    if (!w) {
      setError("Trình duyệt chặn cửa sổ in — hãy cho phép popup rồi thử lại");
      return;
    }
    w.document.write(`<html><head><title>${order.code}</title>
      <style>
        body{font-family:-apple-system,sans-serif;text-align:center;padding:16px;color:#111}
        .code{font-family:monospace;font-size:20px;font-weight:bold;margin:8px 0 2px}
        .src{font-size:12px;color:#555;font-family:monospace}
        img{width:220px;height:220px}
        img.bar{width:260px;height:80px;object-fit:contain;margin-top:6px}
        .name{font-size:15px;font-weight:600;margin:8px 0 2px}
        .price{font-size:14px}
        .note{margin-top:10px;padding:8px;border:1.5px dashed #111;border-radius:8px;font-size:14px;font-weight:600}
      </style></head><body>
      <div class="code">${order.code}</div>
      <div class="src">${sourceName}: ${order.sourceOrderId}</div>
      ${barcode ? `<img class="bar" src="${barcode}" alt="barcode"/>` : ""}
      <img src="${qr}" alt="QR"/>
      <div class="name">${order.name}</div>
      <div class="price">${order.price.toLocaleString("vi-VN")} đ</div>
      ${order.note ? `<div class="note">📝 ${order.note}</div>` : ""}
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-mono font-bold text-xl text-slate-900">{order.code}</p>
          <p className="font-mono text-xs text-slate-500 mt-0.5">{sourceName}: {order.sourceOrderId}</p>
          {barcode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={barcode} alt="barcode" className="w-56 h-16 object-contain mx-auto mt-3" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="w-44 h-44 mx-auto my-3" />
          <p className="font-semibold text-slate-900">{order.name}</p>
          <p className="text-sm text-slate-600 mt-0.5">{order.price.toLocaleString("vi-VN")} đ</p>
          {order.note && (
            <p className="mt-3 text-sm font-semibold text-amber-800 bg-amber-50 border-2 border-dashed border-amber-400 rounded-xl px-3 py-2">
              {order.note}
            </p>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}
        <button
          onClick={printTicket}
          className="mt-4 w-full py-3 rounded-xl bg-[#f1592a] hover:bg-[#e14e20] active:scale-[0.99] text-white font-bold transition flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" /> In phiếu
        </button>
      </div>
    </div>
  );
}

// Popup báo lỗi sản xuất ngay trên card đơn — chuyển đơn về làm lại từ khâu bị lỗi
function ReportErrorModal({ order, onClose }: { order: OrderLite; onClose: () => void }) {
  const options = revertOptions(order.status);
  const [reason, setReason] = useState("");
  // mặc định đá về khâu ngay trước khâu hiện tại
  const [stage, setStage] = useState<Stage>(options[options.length - 1] ?? "created");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/orders/${order._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rework", targetStage: stage, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Có lỗi xảy ra");
      setBusy(false);
      return;
    }
    // reload để danh sách/filter cập nhật trạng thái mới
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <p className="font-semibold text-slate-900">⚠️ Báo lỗi sản xuất</p>
        <p className="text-xs text-slate-500 -mt-2">{order.name}</p>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lỗi gì? VD: Ảnh bị trầy"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-400 text-sm"
        />
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Chuyển đơn về</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-400 bg-white text-sm"
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {STATUS_DISPLAY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !reason.trim()}
          className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận báo lỗi
        </button>
      </div>
    </div>
  );
}

export function OrderCard({ order, viewerRole }: { order: OrderLite; viewerRole?: string }) {
  const overdue = isOverdue(order);
  const [reprint, setReprint] = useState<{ qr: string; barcode: string | null } | null>(null);
  const [reporting, setReporting] = useState(false);
  // Báo lỗi: đơn còn khâu để đá về + role theo khâu chỉ báo được đơn đang chờ khâu mình
  const canReport =
    order.status !== "cancelled" &&
    revertOptions(order.status).length > 0 &&
    (!viewerRole || canActOnOrder(viewerRole, order.status));

  async function openReprint() {
    const qr = await QRCode.toDataURL(order.code, { width: 480, margin: 1 });
    // TikTok: in lại luôn barcode gốc đã quét (Code128)
    let barcode: string | null = null;
    if (order.source === "tiktok") {
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, order.sourceOrderId, {
          format: "CODE128",
          displayValue: false,
          width: 2,
          height: 80,
          margin: 8,
        });
        barcode = canvas.toDataURL("image/png");
      } catch {
        // mã chứa ký tự không encode được — bỏ qua barcode, vẫn in QR
      }
    }
    setReprint({ qr, barcode });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#f6d9c3] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SourceBadge source={order.source} />
            <span className="text-xs font-mono text-slate-500 truncate">{order.sourceOrderId}</span>
          </div>
          <p className="font-semibold text-slate-900 truncate">{order.name}</p>
          <p className="text-sm text-slate-500 truncate">
            {[
              order.customerName,
              order.price > 0 ? fmtVnd(order.price) : "",
              order.quantity > 1 ? `SL: ${order.quantity}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {/* Ai đã tham gia quy trình — để khi lỗi biết ai thực hiện khâu đó */}
      {order.history && order.history.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2.5 text-xs text-slate-500">
          {order.history
            .filter((h) => h.byName)
            .map((h, i) => {
              const isReport = h.note?.startsWith("Báo lỗi");
              if (isReport)
                // hiện luôn nội dung lỗi để khỏi phải mở chi tiết đơn
                return (
                  <span key={i} className="basis-full text-red-600">
                    <span className="font-semibold">⚠ {h.byName}</span>
                    {h.at && <span className="text-red-400"> ({fmtShortTime(h.at)})</span>}
                    <span className="font-medium"> — {h.note}</span>
                  </span>
                );
              return (
                <span key={i}>
                  <span className="text-slate-400">{HISTORY_ROLE_LABELS[h.status] || h.status}:</span>{" "}
                  <span className="font-medium text-slate-600">{h.byName}</span>
                  {h.at && <span className="text-slate-400"> ({fmtShortTime(h.at)})</span>}
                </span>
              );
            })}
        </div>
      )}
      {order.note && (
        <p className="mt-2.5 text-sm font-semibold text-amber-800 bg-amber-50 border border-dashed border-amber-400 rounded-xl px-3 py-2">
          {order.note}
        </p>
      )}
      <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {timeAgo(order.statusChangedAt)}
        </span>
        {overdue && (
          <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> Quá 30 phút
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5">
          {canReport && (
            <button
              onClick={() => setReporting(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold active:scale-95 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Báo lỗi
            </button>
          )}
          {(order.source === "shopee" || order.source === "tiktok") && (
            <button
              onClick={openReprint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#fbeee7] text-[#f1592a] font-semibold active:scale-95 transition"
            >
              <Printer className="w-3.5 h-3.5" /> In phiếu
            </button>
          )}
        </span>
      </div>
      {reprint && (
        <ReprintModal order={order} qr={reprint.qr} barcode={reprint.barcode} onClose={() => setReprint(null)} />
      )}
      {reporting && <ReportErrorModal order={order} onClose={() => setReporting(false)} />}
    </div>
  );
}
