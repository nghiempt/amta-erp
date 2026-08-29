"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, TrendingUp, ShieldAlert } from "lucide-react";
import { STAGE_COLORS, type OrderStatus } from "@/lib/stages";
import { fmtVnd } from "@/lib/format";

interface StatsData {
  created: number;
  revenue: number;
  overdue: number;
  reported: number;
  stageDone: Record<string, number>;
}

const toYmd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function preset(days: number, offset = 0): { from: string; to: string } {
  // offset=0: kết thúc hôm nay; offset=1: kết thúc hôm qua
  const end = new Date();
  end.setDate(end.getDate() - offset);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { from: toYmd(start), to: toYmd(end) };
}

export const PRESETS = [
  { label: "Hôm nay", get: () => preset(1) },
  { label: "Hôm qua", get: () => preset(1, 1) },
  { label: "7 ngày", get: () => preset(7) },
  { label: "30 ngày", get: () => preset(30) },
];

const fmtDmy = (ymd: string) => {
  const [y, m, d] = ymd.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "…";
};

// WebKit không cho style chữ bên trong <input type="date"> → tự render text,
// input thật phủ trong suốt lên trên chỉ để mở date picker
export function DateField({
  value,
  min,
  max,
  onChange,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  return (
    <span className="relative inline-flex items-center justify-center px-2.5 py-1 rounded-full text-sm font-medium text-slate-600 tabular-nums cursor-pointer hover:bg-[#fbeee7] hover:text-[#f1592a] transition">
      {fmtDmy(value)}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onClick={(e) => e.currentTarget.showPicker?.()}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Chọn ngày"
      />
    </span>
  );
}

// Mỗi khâu đã quét xong bao nhiêu đơn trong khoảng thời gian đang chọn
const STAGE_DONE_ROWS: { status: OrderStatus; label: string }[] = [
  { status: "created", label: "CSKH xong" },
  { status: "ky_thuat", label: "Kỹ thuật xong" },
  { status: "in", label: "In xong" },
  { status: "ep", label: "Ép xong" },
  { status: "gia_cong", label: "Gia công xong" },
  { status: "dong_goi", label: "Đóng gói xong" },
  { status: "da_giao", label: "Đã giao" },
  { status: "cancelled", label: "Đã huỷ" },
];

export default function RangeStats() {
  const [range, setRange] = useState(preset(1));
  const [active, setActive] = useState("Hôm nay");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    const res = await fetch(`/api/stats?from=${from}&to=${to}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (range.from && range.to) load(range.from, range.to);
  }, [range, load]);

  const tiles = [
    { label: "Tổng đơn", value: data?.created, icon: Package, color: "text-indigo-600 bg-indigo-50" },
    // đếm dồn số đơn có báo lỗi trong khoảng (kể cả đã sửa) — không link sang filter
    // "đang báo lỗi" của tab Đơn hàng vì hai con số khác ý nghĩa
    { label: "Đơn lỗi", value: data?.reported, icon: ShieldAlert, color: "text-amber-600 bg-amber-50" },
    { label: "Doanh thu", value: data ? fmtVnd(data.revenue) : undefined, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-4">
      {/* Filter thời gian */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setActive(p.label);
              setRange(p.get());
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              active === p.label
                ? "bg-[#f1592a] text-white shadow-sm shadow-[#f1592a]/25"
                : "bg-white border border-[#f6d9c3] text-slate-600 active:bg-[#fbeee7]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="inline-flex items-center text-xs text-slate-300 ml-auto rounded-full border border-[#f6d9c3] bg-white px-1 py-0.5">
          <DateField
            value={range.from}
            max={range.to}
            onChange={(v) => {
              setActive("");
              setRange((r) => ({ ...r, from: v }));
            }}
          />
          –
          <DateField
            value={range.to}
            min={range.from}
            onChange={(v) => {
              setActive("");
              setRange((r) => ({ ...r, to: v }));
            }}
          />
        </span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#f1592a]" />}
      </div>

      {/* 4 chỉ số chính */}
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-100 p-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${t.color}`}>
              <t.icon className="w-5 h-5" />
            </div>
            <p className="text-lg font-bold text-slate-900 leading-tight">{t.value ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Mỗi khâu quét xong bao nhiêu đơn trong khoảng đang chọn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STAGE_DONE_ROWS.map(({ status, label }) => {
          const c = STAGE_COLORS[status];
          return (
            <div key={status} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${c.bg}`}>
              <span className={`text-sm font-medium ${c.text}`}>{label}</span>
              <span className={`text-sm font-bold ${c.text}`}>{data?.stageDone[status] || 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
