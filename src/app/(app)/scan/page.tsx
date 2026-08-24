"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Loader2,
  ArrowRightCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { StatusBadge, SourceBadge, fmtVnd } from "@/components/OrderBits";
import { STAGE_LABELS, nextStage, type OrderStatus } from "@/lib/stages";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

interface ScannedOrder {
  _id: string;
  code: string;
  source: string;
  name: string;
  price: number;
  quantity: number;
  customerName?: string;
  status: OrderStatus;
}

export default function ScanPage() {
  const [order, setOrder] = useState<ScannedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [manual, setManual] = useState("");

  async function lookup(code: string) {
    if (loading || order) return;
    setLoading(true);
    setError("");
    setDone("");
    if (navigator.vibrate) navigator.vibrate(80);
    const res = await fetch(`/api/orders/${encodeURIComponent(code.trim())}`);
    const data = await res.json();
    if (!res.ok) setError(`Không tìm thấy đơn với mã "${code}"`);
    else setOrder(data.order);
    setLoading(false);
  }

  async function advance() {
    if (!order) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/orders/${order._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance" }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Có lỗi xảy ra");
    else {
      setDone(data.message);
      setOrder(data.order);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
    setLoading(false);
  }

  function reset() {
    setOrder(null);
    setError("");
    setDone("");
    setManual("");
  }

  const next = order && order.status !== "cancelled" ? nextStage(order.status) : null;

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Quét mã QR</h1>
        <p className="text-sm text-slate-500">Quét tem QR trên đơn để cập nhật khâu tiếp theo</p>
      </div>

      {!order ? (
        <>
          <Scanner onScan={lookup} paused={loading} />
          <div className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="Hoặc nhập mã: AMTA-..."
              className="flex-1 px-3.5 py-3 rounded-xl border border-slate-200 bg-white font-mono text-sm outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => manual && lookup(manual)}
              disabled={!manual || loading}
              className="px-4 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tìm"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {/* Kết quả */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SourceBadge source={order.source} />
                  <span className="text-xs font-mono text-slate-500">{order.code}</span>
                </div>
                <p className="font-bold text-slate-900">{order.name}</p>
                <p className="text-sm text-slate-500">
                  {order.customerName ? `${order.customerName} · ` : ""}
                  {fmtVnd(order.price)} × {order.quantity}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <Link
              href={`/orders/${order._id}`}
              className="text-sm text-indigo-600 font-medium inline-flex items-center gap-1"
            >
              Xem chi tiết <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {done && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800">{done}</p>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          {!done && next && (
            <button
              onClick={advance}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-indigo-600 active:scale-[0.98] text-white font-semibold text-base transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightCircle className="w-5 h-5" />}
              Xác nhận: {STAGE_LABELS[next]}
            </button>
          )}
          {!done && !next && order.status === "da_giao" && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 text-center">
              Đơn này đã giao xong ✅
            </p>
          )}
          {!done && order.status === "cancelled" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
              Đơn này đã bị huỷ, không thể cập nhật
            </p>
          )}

          <button
            onClick={reset}
            className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-medium text-sm flex items-center justify-center gap-2 active:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" /> Quét đơn khác
          </button>
        </div>
      )}
    </div>
  );
}
