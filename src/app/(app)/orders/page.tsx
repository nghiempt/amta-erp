"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Inbox, X, ChevronDown } from "lucide-react";
import { OrderCard, type OrderLite } from "@/components/OrderBits";
import { DateField, PRESETS } from "@/components/RangeStats";
import { STATUS_DISPLAY_LABELS, type OrderStatus } from "@/lib/stages";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả" },
  ...(["cho_cskh", "created", "ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao", "cancelled"] as OrderStatus[]).map(
    (s) => ({ value: s, label: STATUS_DISPLAY_LABELS[s] })
  ),
];

function OrdersList() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") || "");
  const [status, setStatus] = useState(sp.get("status") || "");
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [activePreset, setActivePreset] = useState("Tất cả");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [items, setItems] = useState<OrderLite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState<string | undefined>(undefined);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setViewerRole(d.user.role))
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (
      q: string,
      status: string,
      range: { from: string; to: string },
      sort: string,
      page: number,
      append = false
    ) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (range.from && range.to) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    params.set("sort", sort);
    params.set("page", String(page));
    const res = await fetch(`/api/orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
    },
    []
  );

  useEffect(() => {
    setPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(q, status, range, sort, 1), q ? 300 : 0);
    return () => clearTimeout(debounce.current);
  }, [q, status, range, sort, load]);

  function pickStatus(v: string) {
    setStatus(v);
    const params = new URLSearchParams();
    if (v) params.set("status", v);
    router.replace(`/orders${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Đơn hàng</h1>
        <span className="text-sm text-slate-500">{total} đơn</span>
      </div>

      {/* Lọc theo thời gian tạo đơn — nằm trên ô search */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => {
            setActivePreset("Tất cả");
            setRange({ from: "", to: "" });
          }}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
            activePreset === "Tất cả"
              ? "bg-[#f1592a] text-white shadow-sm shadow-[#f1592a]/25"
              : "bg-white border border-[#f6d9c3] text-slate-600 active:bg-[#fbeee7]"
          }`}
        >
          Tất cả
        </button>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setActivePreset(p.label);
              setRange(p.get());
            }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              activePreset === p.label
                ? "bg-[#f1592a] text-white shadow-sm shadow-[#f1592a]/25"
                : "bg-white border border-[#f6d9c3] text-slate-600 active:bg-[#fbeee7]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="inline-flex items-center text-sm text-slate-300 rounded-full border border-[#f6d9c3] bg-white px-1.5 py-0.5">
          <DateField
            value={range.from}
            max={range.to || undefined}
            onChange={(v) => {
              setActivePreset("");
              setRange((r) => ({ ...r, from: v }));
            }}
          />
          –
          <DateField
            value={range.to}
            min={range.from || undefined}
            onChange={(v) => {
              setActivePreset("");
              setRange((r) => ({ ...r, to: v }));
            }}
          />
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo mã, tên đơn, khách hàng..."
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[#fbeee7] text-sm border-2 border-transparent focus:border-[#f1592a] focus:bg-white outline-none transition placeholder:text-slate-400"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sắp xếp — bên phải, dưới ô search */}
      <div className="flex justify-end -mt-1">
        <span className="relative inline-flex items-center">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            style={{ fontSize: 14 }}
            className="appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-sm font-medium bg-white border border-[#f6d9c3] text-slate-600 outline-none cursor-pointer focus:border-[#f1592a] transition"
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
        </span>
      </div>

      {/* Filter chips — scroll ngang trên mobile */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-2!">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => pickStatus(f.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              status === f.value
                ? "bg-[#f1592a] text-white shadow-sm shadow-[#f1592a]/25"
                : "bg-white border border-[#f6d9c3] text-slate-600 active:bg-[#fbeee7]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-[#f1592a]" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Inbox className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Không có đơn nào</p>
        </div>
      ) : (
        <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {items.map((o) => (
            <OrderCard key={o._id} order={o} viewerRole={viewerRole} />
          ))}
        </div>
      )}

      {page < pages && (
        <button
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(q, status, range, sort, next, true);
          }}
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-white border border-[#f6d9c3] text-sm font-medium text-slate-600 active:bg-[#fbeee7] flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Tải thêm
        </button>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersList />
    </Suspense>
  );
}
