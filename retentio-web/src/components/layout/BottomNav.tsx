"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardList, Bell, Menu, X, LogOut } from "lucide-react";
import { useUnreadCount } from "@/hooks/use-notifications";

const NAV_ITEMS = [
  { href: "/pipeline", label: "Pipeline", icon: BarChart3 },
  { href: "/hoje", label: "Hoje", icon: ClipboardList },
];

const MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📈" },
  { href: "/cadencias", label: "Cadências", icon: "⚡" },
  { href: "/templates", label: "Templates", icon: "📝" },
  { href: "/emails", label: "Emails", icon: "📧" },
  { href: "/glossario", label: "Glossário", icon: "📖" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
  { href: "/gestor", label: "Painel Gestor", icon: "🏠" },
  { href: "/gestor/sdrs", label: "SDRs", icon: "👥" },
  { href: "/gestor/metas", label: "Metas", icon: "🎯" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useUnreadCount();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("retentio_user");
    router.push("/login");
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface pb-safe lg:hidden">
        <div className="flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[60px] ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* Notifications */}
          <Link
            href="/hoje"
            className={`relative flex flex-col items-center gap-0.5 px-3 py-2 min-w-[60px] text-muted-foreground`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="text-[10px] font-medium">Notif</span>
          </Link>

          {/* Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[60px] text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Menu Sheet overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-surface border-l border-border shadow-xl animate-in slide-in-from-right duration-200 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="text-sm font-bold text-foreground">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1 p-3">
              {MENU_ITEMS.map(({ href, label, icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                      isActive
                        ? "bg-accent/10 font-medium text-accent"
                        : "text-foreground hover:bg-surface-raised"
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border px-3 py-3 mt-auto">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
