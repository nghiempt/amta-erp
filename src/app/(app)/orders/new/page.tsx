"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ScanBarcode,
  Keyboard,
  Loader2,
  CheckCircle2,
  ImagePlus,
  X,
} from "lucide-react";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

type Source = "tiktok" | "shopee";

export default function NewOrderPage() {
  const router = useRouter();
  const [source, setSource] = useState<Source>("tiktok");
  const [scanning, setScanning] = useState(false);
  const [sourceOrderId, setSourceOrderId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function pickSource(s: Source) {
    setSource(s);
    setScanning(s === "tiktok");
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setImageUrl(data.url);
    else setError(data.error || "Upload thất bại");
    setUploading(false);
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
        price: Number(price),
        quantity: Number(quantity) || 1,
        customerName,
        note,
        imageUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Tạo đơn thất bại");
      setSaving(false);
      return;
    }
    router.replace(`/orders/${data.order._id}?created=1`);
  }

  const inputCls =
    "w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Tạo đơn hàng</h1>
        <p className="text-sm text-slate-500">Quét barcode TikTok hoặc nhập mã đơn Shopee</p>
      </div>

      {/* Chọn nguồn */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => pickSource("tiktok")}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
            source === "tiktok"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <ScanBarcode className="w-7 h-7" />
          <span className="text-sm font-semibold">TikTok — quét barcode</span>
        </button>
        <button
          type="button"
          onClick={() => pickSource("shopee")}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
            source === "shopee"
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <Keyboard className="w-7 h-7" />
          <span className="text-sm font-semibold">Shopee — nhập mã đơn</span>
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
            className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-600"
          >
            Nhập tay thay vì quét
          </button>
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Mã đơn {source === "tiktok" ? "TikTok" : "Shopee"} *
          </label>
          <div className="flex gap-2">
            <input
              value={sourceOrderId}
              onChange={(e) => setSourceOrderId(e.target.value)}
              required
              placeholder={source === "tiktok" ? "Quét barcode hoặc nhập tay" : "VD: 2508ABCDEF1234"}
              className={`${inputCls} font-mono`}
            />
            {source === "tiktok" && !scanning && (
              <button
                type="button"
                onClick={() => setScanning(true)}
                className="shrink-0 px-3.5 rounded-xl bg-slate-900 text-white"
                aria-label="Quét barcode"
              >
                <ScanBarcode className="w-5 h-5" />
              </button>
            )}
          </div>
          {sourceOrderId && (
            <p className="text-xs text-emerald-600 mt-1.5 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã có mã đơn
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tên đơn / sản phẩm *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Áo thun in hình mèo - size L" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Giá (VND) *</label>
            <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="150000" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Số lượng</label>
            <input type="number" inputMode="numeric" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tên khách hàng</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nguyễn Văn A" className={inputCls} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Ghi chú</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Yêu cầu đặc biệt..." className={inputCls} />
        </div>

        {/* Ảnh sản phẩm */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Ảnh sản phẩm</label>
          {imageUrl ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="w-24 h-24 object-cover rounded-xl border border-slate-200" />
              <button type="button" onClick={() => setImageUrl("")} className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3.5 py-3 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 cursor-pointer active:bg-slate-50">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              {uploading ? "Đang tải..." : "Chụp / chọn ảnh"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          Tạo đơn & sinh mã QR
        </button>
      </form>
    </div>
  );
}
