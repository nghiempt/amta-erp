"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, UserRound } from "lucide-react";

interface Staff {
  _id: string;
  name: string;
  username: string;
  role: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "cskh", label: "CSKH" },
  { value: "ky_thuat", label: "Kỹ thuật" },
  { value: "in", label: "In" },
  { value: "ep", label: "Ép" },
  { value: "gia_cong", label: "Gia công" },
  { value: "dong_goi", label: "Đóng gói" },
  { value: "da_giao", label: "Giao hàng" },
  { value: "admin", label: "Quản lý" },
];
const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#fbeee7] text-sm text-slate-800 placeholder:text-slate-400 border-2 border-transparent focus:border-[#f1592a] focus:bg-white outline-none transition";

// Form thêm / sửa nhân viên (edit: không đổi username, password trống = giữ nguyên)
function StaffModal({
  staff,
  onClose,
  onSaved,
}: {
  staff: Staff | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!staff;
  const [name, setName] = useState(staff?.name || "");
  const [username, setUsername] = useState(staff?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(staff?.role || "cskh");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(isEdit ? `/api/users/${staff!._id}` : "/api/users", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { name, role, password: password || undefined } : { name, username, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Có lỗi xảy ra");
      setBusy(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <p className="font-semibold text-slate-900">{isEdit ? "Sửa nhân viên" : "Thêm nhân viên"}</p>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Tên nhân viên *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Nguyễn Văn A" className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Tên tài khoản *</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
            required
            disabled={isEdit}
            placeholder="VD: vana"
            className={`${inputCls} font-mono disabled:opacity-60`}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">
            Mật khẩu {isEdit ? "(bỏ trống nếu không đổi)" : "*"}
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEdit}
            minLength={6}
            placeholder="Tối thiểu 6 ký tự"
            className={`${inputCls} font-mono`}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Chức vụ *</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={`${inputCls} cursor-pointer`}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          disabled={busy}
          className="w-full py-3 rounded-xl bg-[#f1592a] hover:bg-[#e14e20] text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? "Lưu thay đổi" : "Tạo tài khoản"}
        </button>
      </form>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ open: boolean; staff: Staff | null }>({ open: false, staff: null });
  const [deleting, setDeleting] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users);
    else setError(data.error || "Không tải được danh sách");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/users/${deleting._id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Xoá thất bại");
    } else {
      setError("");
      setUsers((u) => u.filter((x) => x._id !== deleting._id));
    }
    setBusy(false);
    setDeleting(null);
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Nhân viên</h1>
        <button
          onClick={() => setModal({ open: true, staff: null })}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f1592a] text-white text-sm font-semibold active:scale-95 transition"
        >
          <Plus className="w-4 h-4" /> Thêm nhân viên
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-[#f1592a]" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u._id} className="bg-white rounded-2xl border border-[#f6d9c3] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#fbeee7] text-[#f1592a] flex items-center justify-center shrink-0">
                <UserRound className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                <p className="text-xs text-slate-500 font-mono truncate">{u.username}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 shrink-0">
                {ROLE_LABEL[u.role] || u.role}
              </span>
              <button
                onClick={() => setModal({ open: true, staff: u })}
                aria-label="Sửa"
                className="p-2 rounded-lg text-slate-400 hover:text-[#f1592a] hover:bg-[#fbeee7] transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleting(u)}
                aria-label="Xoá"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <StaffModal
          staff={modal.staff}
          onClose={() => setModal({ open: false, staff: null })}
          onSaved={() => {
            setModal({ open: false, staff: null });
            load();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-slate-900">Xoá nhân viên?</p>
            <p className="text-sm text-slate-500">
              {deleting.name} ({deleting.username}) sẽ không đăng nhập được nữa. Lịch sử đơn hàng vẫn giữ nguyên tên.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-sm font-medium text-slate-600">
                Không
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
