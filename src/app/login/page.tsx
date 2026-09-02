"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Đăng nhập thất bại");
      setLoading(false);
      return;
    }
    router.replace(sp.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-linear-to-br from-white via-[#fdf6f1] to-[#faeee5] p-6 overflow-hidden">
      {/* mảng tròn trang trí mờ */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#f6d9c3]/40 pointer-events-none" />
      <div className="absolute -bottom-28 -left-20 w-64 h-64 rounded-full bg-[#f6d9c3]/30 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/amta-logo-tr.png"
            alt="Ảnh Màu Tuấn Anh"
            width={56}
            height={56}
            className="mx-auto mb-5 w-14 h-14 object-contain"
          />
          <h1 className="text-2xl font-extrabold text-[#f1592a] tracking-tight">
            Đăng nhập
          </h1>
          {/* <p className="text-slate-900 font-bold text-lg mt-4 leading-snug">
            Ảnh Màu Tuấn Anh
          </p> */}
          <p className="text-slate-500 text-sm mt-1">Quản lý đơn hàng và quy trình</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoComplete="username"
            required
            placeholder="Tài khoản"
            className="w-full px-5 py-3.5 rounded-xl bg-[#fbeee7] text-sm text-slate-800 placeholder:text-slate-400 border-2 border-transparent focus:border-[#f1592a] focus:bg-white outline-none transition"
          />
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="Mật khẩu"
              className="w-full px-5 py-4 pr-13 rounded-xl bg-[#fbeee7] text-slate-800 placeholder:text-slate-400 border-2 border-transparent focus:border-[#f1592a] focus:bg-white outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#f1592a] transition"
              aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>
          )}

          <button
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#f1592a] hover:bg-[#e14e20] active:scale-[0.99] text-white font-bold text-base transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#f1592a]/35"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Đăng nhập
          </button>
        </form>

        <p className="text-center text-red-600 text-xs mt-10">
          © {new Date().getFullYear()} Ảnh Màu Tuấn Anh
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
