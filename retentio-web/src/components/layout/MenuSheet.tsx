"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  BookOpen,
  Bell,
  Users,
  Target,
  Palette,
  ChevronRight,
} from "lucide-react";

interface StoredUser {
  name: string;
  role: string;
  email: string;
}

const MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/glossario", label: "Glossário", icon: BookOpen },
  { href: "/configuracoes", label: "Notificações", icon: Bell },
];

const GESTOR_ITEMS = [
  { href: "/gestor", label: "Painel do Gestor", icon: Users },
  { href: "/gestor/metas", label: "Metas", icon: Target },
  { href: "/gestor/marca", label: "Personalização", icon: Palette },
];

interface MenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MenuSheet({ open, onOpenChange }: MenuSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("retentio_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const isGestor = user?.role === "GESTOR";

  function navigate(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-surface outline-none">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <Drawer.Title className="px-4 pb-3 text-base font-bold text-foreground">
            Menu
          </Drawer.Title>

          <div className="overflow-y-auto px-4 pb-safe">
            {/* Main items */}
            <div className="rounded-xl border border-border bg-surface-raised/50 divide-y divide-border mb-3">
              {MENU_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <button
                    key={href}
                    onClick={() => navigate(href)}
                    className="flex w-full items-center justify-between px-4 py-3.5 active:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          isActive ? "bg-accent/10 text-accent" : "bg-surface text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-sm ${
                          isActive ? "font-semibold text-accent" : "font-medium text-foreground"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>

            {/* Gestor items */}
            {isGestor && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Gestor
                </p>
                <div className="rounded-xl border border-border bg-surface-raised/50 divide-y divide-border mb-6">
                  {GESTOR_ITEMS.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    return (
                      <button
                        key={href}
                        onClick={() => navigate(href)}
                        className="flex w-full items-center justify-between px-4 py-3.5 active:bg-surface transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              isActive ? "bg-accent/10 text-accent" : "bg-surface text-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span
                            className={`text-sm ${
                              isActive ? "font-semibold text-accent" : "font-medium text-foreground"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
