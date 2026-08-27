"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { initBeepUnlock } from "@/lib/beep";
import {
  LayoutDashboard,
  ClipboardList,
  ScanLine,
  PlusCircle,
  LogOut,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";

const navFor = (role: string) => {
  if (role === "cskh")
    return [
      { href: "/orders/new", label: "Tạo đơn", icon: PlusCircle },
      { href: "/orders", label: "Đơn hàng", icon: ClipboardList },
    ];
  if (role === "admin")
    return [
      { href: "/", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/orders/new", label: "Tạo đơn", icon: PlusCircle },
      { href: "/orders", label: "Đơn hàng", icon: ClipboardList },
      { href: "/scan", label: "Quét QR", icon: ScanLine },
    ];
  return [
    { href: "/scan", label: "Quét mã", icon: ScanLine },
    { href: "/orders", label: "Đơn hàng", icon: ClipboardList },
  ];
};


export default function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = navFor(user.role);

  // Mở khoá audio (tiếng bíp khi quét) ở cú chạm đầu tiên bất kỳ trong app —
  // phải prime trong user gesture thì iOS mới cho phát tiếng lúc quét thành công
  useEffect(() => initBeepUnlock(), []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/orders/new") return pathname === "/orders/new";
    if (href === "/orders")
      return pathname === "/orders" || (pathname.startsWith("/orders/") && pathname !== "/orders/new");
    return pathname === href;
  };

  return (
    <div className="min-h-dvh flex flex-col bg-linear-to-br from-white via-[#fdf6f1] to-[#faeee5]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#f6d9c3]/60">
        {/* Hàng trên: logo + user */}
        <div className="px-4 py-2.5 flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/amta-logo-tr.png"
              alt=""
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-slate-900">Ảnh Màu Tuấn Anh</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-slate-800 max-w-36 truncate">
                {user.name.replace(/^NV\s+/i, "")}
              </p>
            </div>
            <button
              onClick={logout}
              aria-label="Đăng xuất"
              className="p-2 rounded-lg text-slate-400 hover:text-[#f1592a] hover:bg-[#fbeee7] active:scale-95 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hàng dưới: tabs */}
        <nav className="max-w-5xl mx-auto w-full px-2 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                isActive(href)
                  ? "border-[#f1592a] text-[#f1592a]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 pb-8">{children}</main>
    </div>
  );
}
