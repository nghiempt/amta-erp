"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Inbox, X } from "lucide-react";
import { OrderCard, type OrderLite } from "@/components/OrderBits";
import { STAGE_LABELS, type OrderStatus } from "@/lib/stages";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả" },
  ...(["created", "ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao", "cancelled"] as OrderStatus[]).map(
    (s) => ({ value: s, label: STAGE_LABELS[s] })
  ),
];

function OrdersList() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") || "");
  const [status, setStatus] = useState(sp.get("status") || "");
  const [items, setItems] = useState<OrderLite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (q: string, status: string, page: number, append = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    params.set("page", String(page));
    const res = await fetch(`/api/orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(q, status, 1), q ? 300 : 0);
    return () => clearTimeout(debounce.current);
  }, [q, status, load]);

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

      {/* Search */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo mã, tên đơn, khách hàng..."
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[#fbeee7] border-2 border-transparent focus:border-[#f1592a] focus:bg-white outline-none transition placeholder:text-slate-400"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter chips — scroll ngang trên mobile */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <OrderCard key={o._id} order={o} />
          ))}
        </div>
      )}

      {page < pages && (
        <button
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(q, status, next, true);
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
