"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import {
  ScanBarcode,
  Keyboard,
  Loader2,
  Printer,
  PlusCircle,
} from "lucide-react";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

type Source = "tiktok" | "shopee";

interface CreatedOrder {
  code: string;
  sourceOrderId: string;
  name: string;
  price: number;
  note?: string;
  qr: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [source, setSource] = useState<Source>("shopee");
  const [scanning, setScanning] = useState(false);
  const [sourceOrderId, setSourceOrderId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedOrder | null>(null);

  function pickSource(s: Source) {
    setSource(s);
    setScanning(s === "tiktok");
  }

  function resetForm() {
    setCreated(null);
    setSourceOrderId("");
    setName("");
    setPrice("");
    setCustomerName("");
    setNote("");
    setError("");
    setScanning(source === "tiktok");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        sourceOrderId,
        name,
        price: Number(price) || 0,
        customerName,
        note,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Tạo đơn thất bại");
      setSaving(false);
      return;
    }
    if (source === "shopee") {
      // Shopee: sinh QR nội bộ + preview phiếu in
      const qr = await QRCode.toDataURL(data.order.code, { width: 480, margin: 1 });
      setCreated({
        code: data.order.code,
        sourceOrderId: data.order.sourceOrderId,
        name: data.order.name,
        price: data.order.price,
        note: data.order.note,
        qr,
      });
      setSaving(false);
      return;
    }
    // TikTok: bên bán tự in đơn, không cần QR — về danh sách luôn
    router.replace("/orders");
  }

  function printTicket() {
    if (!created) return;
    const w = window.open("", "_blank");
    if (!w) {
      setError("Trình duyệt chặn cửa sổ in — hãy cho phép popup rồi thử lại");
      return;
    }
    w.document.write(`<html><head><title>${created.code}</title>
      <style>
        body{font-family:-apple-system,sans-serif;text-align:center;padding:16px;color:#111}
        .code{font-family:monospace;font-size:20px;font-weight:bold;margin:8px 0 2px}
        .src{font-size:12px;color:#555;font-family:monospace}
        img{width:220px;height:220px}
        .name{font-size:15px;font-weight:600;margin:8px 0 2px}
        .price{font-size:14px}
        .note{margin-top:10px;padding:8px;border:1.5px dashed #111;border-radius:8px;font-size:14px;font-weight:600}
      </style></head><body>
      <div class="code">${created.code}</div>
      <div class="src">Shopee: ${created.sourceOrderId}</div>
      <img src="${created.qr}" alt="QR"/>
      <div class="name">${created.name}</div>
      <div class="price">${created.price.toLocaleString("vi-VN")} đ</div>
      ${created.note ? `<div class="note">📝 ${created.note}</div>` : ""}
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  }

  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-[#fbeee7] text-sm text-slate-800 placeholder:text-slate-400 border-2 border-transparent focus:border-[#f1592a] focus:bg-white outline-none transition";

  // ==== Màn hình sau khi tạo đơn Shopee: preview phiếu + in ====
  if (created) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto space-y-4">
        {/* Preview phiếu */}
        <div className="bg-white rounded-2xl border border-[#f6d9c3] shadow-sm p-6 text-center">
          <p className="font-mono font-bold text-xl text-slate-900">{created.code}</p>
          <p className="font-mono text-xs text-slate-500 mt-0.5">Shopee: {created.sourceOrderId}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={created.qr} alt="QR" className="w-48 h-48 mx-auto my-3" />
          <p className="font-semibold text-slate-900">{created.name}</p>
          <p className="text-sm text-slate-600 mt-0.5">{created.price.toLocaleString("vi-VN")} đ</p>
          {created.note && (
            <p className="mt-3 text-sm font-semibold text-amber-800 bg-amber-50 border-2 border-dashed border-amber-400 rounded-xl px-3 py-2">
              {created.note}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}

        <button
          onClick={printTicket}
          className="w-full py-3.5 rounded-xl bg-[#f1592a] hover:bg-[#e14e20] active:scale-[0.99] text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-[#f1592a]/30"
        >
          <Printer className="w-5 h-5" /> Kiểm tra máy in & In phiếu
        </button>
        <button
          onClick={resetForm}
          className="w-full py-3 rounded-xl bg-white border border-[#f6d9c3] text-slate-700 font-medium flex items-center justify-center gap-2 hover:border-[#f1592a]/40 transition"
        >
          <PlusCircle className="w-4.5 h-4.5" /> Tạo đơn mới
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
          Tạo đơn hàng
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Quét barcode TikTok hoặc nhập mã đơn Shopee
        </p>
      </div>

      {/* Chọn nguồn */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => pickSource("shopee")}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
            source === "shopee"
              ? "border-[#f1592a] bg-[#f1592a] text-white shadow-lg shadow-[#f1592a]/25"
              : "border-[#f6d9c3] bg-white text-slate-600 hover:border-[#f1592a]/40"
          }`}
        >
          <Keyboard className="w-7 h-7" />
          <span className="text-sm font-semibold">Shopee — nhập mã đơn</span>
        </button>
        <button
          type="button"
          onClick={() => pickSource("tiktok")}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
            source === "tiktok"
              ? "border-[#f1592a] bg-[#f1592a] text-white shadow-lg shadow-[#f1592a]/25"
              : "border-[#f6d9c3] bg-white text-slate-600 hover:border-[#f1592a]/40"
          }`}
        >
          <ScanBarcode className="w-7 h-7" />
          <span className="text-sm font-semibold">TikTok — quét barcode</span>
        </button>
      </div>

      {/* Scanner */}
      {source === "tiktok" && scanning && (
        <div className="space-y-2">
          <Scanner
            onScan={(text) => {
              setSourceOrderId(text);
              setScanning(false);
              if (navigator.vibrate) navigator.vibrate(100);
            }}
          />
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="w-full py-2.5 rounded-xl bg-white border border-[#f6d9c3] text-sm text-slate-600 hover:border-[#f1592a]/40 transition"
          >
            Nhập tay thay vì quét
          </button>
        </div>
      )}

      <form
        onSubmit={submit}
        className="bg-white/70 backdrop-blur-sm rounded-2xl border border-[#f6d9c3]/70 shadow-sm p-4 md:p-6 space-y-4"
      >
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Mã đơn {source === "tiktok" ? "TikTok" : "Shopee"} *
          </label>
          <input
            value={sourceOrderId}
            onChange={(e) => setSourceOrderId(e.target.value)}
            required
            placeholder={source === "tiktok" ? "Quét barcode hoặc nhập tay" : "VD: 2508ABCDEF1234"}
            className={`${inputCls} font-mono`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tên đơn / sản phẩm *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Áo thun in hình mèo - size L" className={inputCls} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Giá (VND)</label>
          <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150000" className={inputCls} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tên khách hàng</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="VD: Chị Lan" className={inputCls} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Ghi chú</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Yêu cầu đặc biệt..." className={inputCls} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}

        <button
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-[#f1592a] hover:bg-[#e14e20] active:scale-[0.99] text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#f1592a]/30"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          {source === "shopee" ? "Tạo đơn & sinh mã QR" : "Tạo đơn"}
        </button>
      </form>
    </div>
  );
}
