"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  BarChart3,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  Zap,
  FileText,
  Mail,
  Bell,
  BookOpen,
  Settings,
  LayoutDashboard,
  Users,
  Target,
  Palette,
} from "lucide-react";
import { ThemeToggle } from "../shared/ThemeToggle";
import { NotificationBell } from "../shared/NotificationBell";
import { BrandLogo } from "../shared/BrandLogo";
import { UserAvatar } from "../shared/UserAvatar";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface StoredUser {
  name: string;
  role: string;
  email: string;
  avatar_url?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hasBadge?: boolean;
}

const sdrNav: NavItem[] = [
  { href: "/pipeline", label: "Pipeline", icon: BarChart3 },
  { href: "/hoje", label: "Hoje", icon: ClipboardList },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard", label: "Dashboard", icon: TrendingUp },
  { href: "/cadencias", label: "Cadências", icon: Zap },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/notificacoes", label: "Notificações", icon: Bell, hasBadge: true },
  { href: "/glossario", label: "Glossário", icon: BookOpen },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const gestorNav: NavItem[] = [
  { href: "/gestor", label: "Painel", icon: LayoutDashboard },
  { href: "/gestor/sdrs", label: "SDRs", icon: Users },
  { href: "/gestor/metas", label: "Metas", icon: Target },
  { href: "/gestor/marca", label: "Marca", icon: Palette },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("retentio_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const isGestor = user?.role === "GESTOR";
  const unreadCount = useUnreadCount();

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("retentio_user");
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
      {/* Logo */}
      <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-4">
        <BrandLogo />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {isGestor && (
          <>
            <span className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Gestão
            </span>
            {gestorNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm
                    transition-colors duration-150
                    ${
                      isActive
                        ? "bg-accent/10 font-medium text-accent"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    }
                  `}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
            <span className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Operação
            </span>
          </>
        )}
        {sdrNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm
                transition-colors duration-150
                ${
                  isActive
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                }
              `}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {item.hasBadge && unreadCount > 0 && (
                <span className="ml-auto flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <UserAvatar
            name={user?.name ?? ""}
            avatarUrl={user?.avatar_url}
            size="sm"
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
              {user?.name ?? "..."}
            </span>
            <span className="text-[10px] text-gray-400">{user?.role ?? ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
