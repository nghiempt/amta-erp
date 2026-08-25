"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { STATUS_DISPLAY_LABELS, STAGE_COLORS, type OrderStatus } from "@/lib/stages";
import { Clock, AlertTriangle, Printer, X } from "lucide-react";

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
}

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

// Popup in lại phiếu đơn Shopee (backup khi tạo đơn trên điện thoại, in trên máy tính)
function ReprintModal({ order, qr, onClose }: { order: OrderLite; qr: string; onClose: () => void }) {
  const [error, setError] = useState("");

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
        .name{font-size:15px;font-weight:600;margin:8px 0 2px}
        .price{font-size:14px}
        .note{margin-top:10px;padding:8px;border:1.5px dashed #111;border-radius:8px;font-size:14px;font-weight:600}
      </style></head><body>
      <div class="code">${order.code}</div>
      <div class="src">Shopee: ${order.sourceOrderId}</div>
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
          <p className="font-mono text-xs text-slate-500 mt-0.5">Shopee: {order.sourceOrderId}</p>
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

export function OrderCard({ order }: { order: OrderLite }) {
  const overdue = isOverdue(order);
  const [reprintQr, setReprintQr] = useState<string | null>(null);

  async function openReprint() {
    const qr = await QRCode.toDataURL(order.code, { width: 480, margin: 1 });
    setReprintQr(qr);
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
            {order.customerName ? `${order.customerName} · ` : ""}
            {fmtVnd(order.price)} × {order.quantity}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
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
        {order.source === "shopee" && (
          <button
            onClick={openReprint}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#fbeee7] text-[#f1592a] font-semibold active:scale-95 transition"
          >
            <Printer className="w-3.5 h-3.5" /> In phiếu
          </button>
        )}
      </div>
      {reprintQr && <ReprintModal order={order} qr={reprintQr} onClose={() => setReprintQr(null)} />}
    </div>
  );
}
