"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ScanLine,
  PlusCircle,
  LogOut,
  Package,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";

const navFor = (role: string) => [
  ...(role === "admin" ? [{ href: "/", label: "Tổng quan", icon: LayoutDashboard }] : []),
  { href: "/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/scan", label: "Quét QR", icon: ScanLine },
  ...(role === "admin" ? [{ href: "/orders/new", label: "Tạo đơn", icon: PlusCircle }] : []),
];

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || (href === "/orders" && pathname.startsWith("/orders/") && pathname !== "/orders/new");

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-slate-900 text-white min-h-dvh sticky top-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold leading-tight">AMTA ERP</p>
            <p className="text-xs text-slate-400">Quản lý đơn hàng</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive(href)
                  ? "bg-indigo-500 text-white"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-sm">
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-slate-400">
              {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 w-full transition"
          >
            <LogOut className="w-5 h-5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile */}
        <header className="md:hidden sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Package className="w-4.5 h-4.5" />
            </div>
            <span className="font-bold">AMTA ERP</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-300">
            <span className="max-w-28 truncate">{user.name}</span>
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>

        {/* Bottom nav mobile */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 pb-safe">
          <div className="flex">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  isActive(href) ? "text-indigo-600" : "text-slate-400"
                }`}
              >
                <Icon className="w-6 h-6" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
