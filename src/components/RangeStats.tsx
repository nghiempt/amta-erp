"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PackagePlus, Package, Truck, PackageCheck } from "lucide-react";

interface RangeData {
  created: number;
  dongGoi: number;
  choGiao: number;
  daGiao: number;
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

const PRESETS = [
  { label: "Hôm nay", get: () => preset(1) },
  { label: "Hôm qua", get: () => preset(1, 1) },
  { label: "7 ngày", get: () => preset(7) },
];

export default function RangeStats() {
  const [range, setRange] = useState(preset(1));
  const [active, setActive] = useState("Hôm nay");
  const [data, setData] = useState<RangeData | null>(null);
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
    { label: "Đơn tạo", value: data?.created, icon: PackagePlus, color: "text-indigo-600 bg-indigo-50" },
    { label: "Đã đóng gói", value: data?.dongGoi, icon: Package, color: "text-orange-600 bg-orange-50" },
    { label: "Chờ giao", value: data?.choGiao, icon: Truck, color: "text-amber-600 bg-amber-50" },
    { label: "Đã giao", value: data?.daGiao, icon: PackageCheck, color: "text-emerald-600 bg-emerald-50" },
  ];

  const dateCls =
    "px-3 py-2 rounded-xl bg-[#fbeee7] text-sm text-slate-700 border-2 border-transparent focus:border-[#f1592a] focus:bg-white outline-none transition";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-slate-900">Số liệu theo thời gian</h2>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#f1592a]" />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setActive(p.label);
              setRange(p.get());
            }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              active === p.label
                ? "bg-[#f1592a] text-white shadow-sm shadow-[#f1592a]/25"
                : "bg-white border border-[#f6d9c3] text-slate-600 active:bg-[#fbeee7]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => {
              setActive("");
              setRange((r) => ({ ...r, from: e.target.value }));
            }}
            className={dateCls}
          />
          →
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => {
              setActive("");
              setRange((r) => ({ ...r, to: e.target.value }));
            }}
            className={dateCls}
          />
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-100 p-3.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${t.color}`}>
              <t.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-bold text-slate-900 leading-tight">{t.value ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
