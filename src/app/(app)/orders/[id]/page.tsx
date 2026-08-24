"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Loader2,
  ArrowRightCircle,
  XCircle,
  Printer,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import { StatusBadge, SourceBadge, fmtVnd, timeAgo, isOverdue } from "@/components/OrderBits";
import { STAGE_LABELS, nextStage, type OrderStatus } from "@/lib/stages";

interface HistoryEntry {
  status: OrderStatus;
  at: string;
  byName: string;
  note?: string;
}
interface OrderFull {
  _id: string;
  code: string;
  source: "tiktok" | "shopee" | "other";
  sourceOrderId: string;
  name: string;
  price: number;
  quantity: number;
  customerName?: string;
  note?: string;
  imageUrl?: string;
  status: OrderStatus;
  statusChangedAt: string;
  history: HistoryEntry[];
  cancelReason?: string;
  createdByName?: string;
  createdAt: string;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [role, setRole] = useState<string>("staff");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    const [oRes, meRes] = await Promise.all([fetch(`/api/orders/${id}`), fetch("/api/auth/me")]);
    if (oRes.ok) {
      const data = await oRes.json();
      setOrder(data.order);
      setQr(await QRCode.toDataURL(data.order.code, { width: 480, margin: 1 }));
    } else setError("Không tìm thấy đơn");
    if (meRes.ok) setRole((await meRes.json()).user.role);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMsg("");
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Có lỗi xảy ra");
    else {
      setOrder(data.order);
      setMsg(data.message);
      if (navigator.vibrate) navigator.vibrate(100);
    }
    setBusy(false);
    setConfirmCancel(false);
  }

  function printQr() {
    if (!order || !qr) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${order.code}</title></head><body style="text-align:center;font-family:sans-serif">
       <img src="${qr}" style="width:280px"/><h2 style="margin:8px 0">${order.code}</h2>
       <p>${order.name}</p><script>window.onload=()=>window.print()</script></body></html>`
    );
    w.document.close();
  }

  if (!order)
    return (
      <div className="flex justify-center py-20">
        {error ? <p className="text-slate-500">{error}</p> : <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />}
      </div>
    );

  const next = order.status !== "cancelled" ? nextStage(order.status) : null;
  const overdue = isOverdue(order);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 font-medium">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      {msg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 inline-flex items-center gap-2 w-full">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </p>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <SourceBadge source={order.source} />
              <span className="text-xs font-mono text-slate-500">{order.sourceOrderId}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900">{order.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {fmtVnd(order.price)} × {order.quantity} ={" "}
              <span className="font-semibold text-slate-700">{fmtVnd(order.price * order.quantity)}</span>
            </p>
            {order.customerName && (
              <p className="text-sm text-slate-500 inline-flex items-center gap-1 mt-1">
                <UserIcon className="w-3.5 h-3.5" /> {order.customerName}
              </p>
            )}
          </div>
          <StatusBadge status={order.status} />
        </div>
        {order.note && (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 mt-3">📝 {order.note}</p>
        )}
        {order.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.imageUrl} alt="" className="mt-3 w-28 h-28 object-cover rounded-xl border border-slate-200" />
        )}
        {order.status === "cancelled" && order.cancelReason && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">Lý do huỷ: {order.cancelReason}</p>
        )}
        {overdue && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">
            ⚠️ Đơn đã ở khâu &quot;{STAGE_LABELS[order.status]}&quot; hơn 30 phút ({timeAgo(order.statusChangedAt)})
          </p>
        )}
      </div>

      {/* QR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 flex items-center gap-4">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR" className="w-28 h-28 md:w-36 md:h-36 rounded-xl border border-slate-100" />
        )}
        <div className="min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Mã QR nội bộ</p>
          <p className="font-mono font-bold text-slate-900 text-sm md:text-base break-all">{order.code}</p>
          <button
            onClick={printQr}
            className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium active:scale-[0.98] transition"
          >
            <Printer className="w-4 h-4" /> In tem QR
          </button>
        </div>
      </div>

      {/* Actions */}
      {next && (
        <button
          onClick={() => patch({ action: "advance" })}
          disabled={busy}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60 text-base"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightCircle className="w-5 h-5" />}
          Chuyển sang: {STAGE_LABELS[next]}
        </button>
      )}

      {role === "admin" && order.status !== "cancelled" && order.status !== "da_giao" && (
        confirmCancel ? (
          <div className="bg-white rounded-2xl border border-red-200 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Lý do huỷ đơn?</p>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="VD: Khách huỷ đơn"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-sm font-medium text-slate-600">
                Không
              </button>
              <button
                onClick={() => patch({ action: "cancel", reason: cancelReason })}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                Xác nhận huỷ
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            className="w-full py-3 rounded-2xl border border-red-200 text-red-600 font-medium text-sm flex items-center justify-center gap-2 bg-white active:bg-red-50"
          >
            <XCircle className="w-4 h-4" /> Huỷ đơn
          </button>
        )
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Lịch sử xử lý</h2>
        <ol className="space-y-4">
          {[...order.history].reverse().map((h, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-indigo-500 ring-4 ring-indigo-100" : "bg-slate-300"}`} />
                {i < order.history.length - 1 && <span className="flex-1 w-px bg-slate-200 mt-1" />}
              </div>
              <div className="pb-1">
                <p className="text-sm font-semibold text-slate-800">{STAGE_LABELS[h.status]}</p>
                <p className="text-xs text-slate-500">
                  {h.byName} · {new Date(h.at).toLocaleString("vi-VN")}
                </p>
                {h.note && <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
