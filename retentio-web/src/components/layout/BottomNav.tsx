"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarCheck, Search, Zap, Menu, LayoutDashboard } from "lucide-react";
import { MenuSheet } from "./MenuSheet";
import { SearchSheet } from "./SearchSheet";

type NavItem =
  | { href: string; label: string; icon: typeof BarChart3 }
  | { id: string; label: string; icon: typeof Search };

const SDR_ITEMS: NavItem[] = [
  { href: "/pipeline", label: "Pipeline", icon: BarChart3 },
  { href: "/hoje", label: "Hoje", icon: CalendarCheck },
  { id: "search", label: "Busca", icon: Search },
  { href: "/cadencias", label: "Cadências", icon: Zap },
  { id: "menu", label: "Mais", icon: Menu },
];

const GESTOR_ITEMS: NavItem[] = [
  { href: "/gestor", label: "Painel", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: BarChart3 },
  { id: "search", label: "Busca", icon: Search },
  { href: "/hoje", label: "Hoje", icon: CalendarCheck },
  { id: "menu", label: "Mais", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tapped, setTapped] = useState<string | null>(null);
  const [isGestor, setIsGestor] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("retentio_user");
      if (raw) {
        const user = JSON.parse(raw);
        setIsGestor(user.role === "GESTOR");
      }
    } catch {}
  }, []);

  const NAV_ITEMS = isGestor ? GESTOR_ITEMS : SDR_ITEMS;

  // Spring animation on tap
  useEffect(() => {
    if (tapped) {
      const timer = setTimeout(() => setTapped(null), 200);
      return () => clearTimeout(timer);
    }
  }, [tapped]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="border-t border-border bg-surface/90 backdrop-blur-md">
          <div className="flex items-center justify-around px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const key = "href" in item ? item.href : item.id;
              const isLink = "href" in item;
              const isActive = isLink && (pathname === item.href || pathname.startsWith(item.href + "/"));
              const isScaled = tapped === key;

              const content = (
                <div className="flex flex-col items-center gap-0.5 py-2 min-w-[56px]">
                  <div className="relative">
                    <Icon
                      className={`h-5 w-5 transition-all duration-150 ${
                        isActive ? "text-accent" : "text-muted-foreground"
                      }`}
                      style={{
                        transform: isScaled ? "scale(1.15)" : "scale(1)",
                        transition: "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    />
                    {/* Active dot */}
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] leading-tight ${
                      isActive
                        ? "font-medium text-accent"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );

              if (isLink) {
                return (
                  <Link
                    key={key}
                    href={item.href}
                    onClick={() => setTapped(key)}
                    className="flex items-center justify-center"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={key}
                  onClick={() => {
                    setTapped(key);
                    if (item.id === "menu") setMenuOpen(true);
                    if (item.id === "search") setSearchOpen(true);
                  }}
                  className="flex items-center justify-center"
                >
                  {content}
                </button>
              );
            })}
          </div>
          <div className="pb-safe" />
        </div>
      </nav>

      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
      <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
