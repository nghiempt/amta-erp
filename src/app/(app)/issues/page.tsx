"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, Wrench, CheckCircle2, Clock, AlertTriangle, PackageCheck } from "lucide-react";
import { DateField, PRESETS } from "@/components/RangeStats";

interface IssuesData {
  reported: number;
  reportedOpen: number;
  reportedFixed: number;
  late: number;
  lateOpen: number;
  lateFixed: number;
}

export default function IssuesPage() {
  const [range, setRange] = useState(PRESETS[0].get()); // Hôm nay
  const [active, setActive] = useState(PRESETS[0].label);
  const [data, setData] = useState<IssuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/issues-stats?from=${from}&to=${to}`);
    const d = await res.json();
    if (res.ok) setData(d);
    else setError(d.error || "Không tải được số liệu");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (range.from && range.to) load(range.from, range.to);
  }, [range, load]);

  const groups = [
    {
      title: "Đơn lỗi",
      tiles: [
        { label: "Đã báo lỗi", value: data?.reported, icon: ShieldAlert, color: "text-amber-600 bg-amber-50" },
        { label: "Chưa sửa lỗi", value: data?.reportedOpen, icon: Wrench, color: "text-red-600 bg-red-50" },
        { label: "Đã sửa lỗi", value: data?.reportedFixed, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
      ],
    },
    {
      title: "Đơn trễ (>30 phút / khâu)",
      tiles: [
        { label: "Đã trễ", value: data?.late, icon: Clock, color: "text-amber-600 bg-amber-50" },
        { label: "Còn trễ chưa xử lý", value: data?.lateOpen, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
        { label: "Trễ đã được xử lý", value: data?.lateFixed, icon: PackageCheck, color: "text-emerald-600 bg-emerald-50" },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900">Đơn lỗi & trễ</h1>

      {/* Filter thời gian — giống dashboard */}
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
        <span className="inline-flex items-center text-sm text-slate-300 ml-auto rounded-full border border-[#f6d9c3] bg-white px-1 py-0.5">
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

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {groups.map((g) => (
        <div key={g.title} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
          <h2 className="font-semibold text-slate-900 mb-3">{g.title}</h2>
          <div className="grid grid-cols-3 gap-3">
            {g.tiles.map((t) => (
              <div key={t.label} className="rounded-xl border border-slate-100 p-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${t.color}`}>
                  <t.icon className="w-5 h-5" />
                </div>
                <p className="text-lg font-bold text-slate-900 leading-tight">{t.value ?? "—"}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
