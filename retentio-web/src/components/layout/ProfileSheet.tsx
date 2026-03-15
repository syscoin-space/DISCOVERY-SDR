"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  User,
  Bell,
  Palette,
  BookOpen,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { AccountSheet } from "./AccountSheet";

interface StoredUser {
  name: string;
  role: string;
  email: string;
}

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StoredUser | null;
}

export function ProfileSheet({ open, onOpenChange, user }: ProfileSheetProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [accountOpen, setAccountOpen] = useState(false);
  const isDark = theme === "dark";

  const isGestor = user?.role === "GESTOR";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  function handleLogout() {
    if (!confirm("Tem certeza que quer sair?")) return;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("retentio_user");
    router.push("/login");
  }

  function navigate(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-surface outline-none">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <Drawer.Title className="sr-only">Perfil</Drawer.Title>

            <div className="overflow-y-auto px-4 pb-safe">
              {/* User Card */}
              <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-navy/10 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground truncate">
                      {user?.name ?? "..."}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user?.email ?? ""}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        {user?.role ?? "SDR"}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div className="rounded-xl border border-border bg-surface-raised/50 mb-3">
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="flex w-full items-center justify-between px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-foreground">
                      {isDark ? (
                        <Moon className="h-4 w-4 transition-transform" />
                      ) : (
                        <Sun className="h-4 w-4 transition-transform" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      Modo Escuro
                    </span>
                  </div>
                  <div
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      isDark ? "bg-accent" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        isDark ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Menu Items */}
              <div className="rounded-xl border border-border bg-surface-raised/50 mb-3 divide-y divide-border">
                <MenuItem
                  icon={<User className="h-4 w-4" />}
                  label="Minha Conta"
                  onClick={() => setAccountOpen(true)}
                />
                <MenuItem
                  icon={<Bell className="h-4 w-4" />}
                  label="Notificações"
                  onClick={() => navigate("/configuracoes")}
                />
                {isGestor && (
                  <MenuItem
                    icon={<Palette className="h-4 w-4" />}
                    label="Personalização"
                    onClick={() => navigate("/gestor/marca")}
                  />
                )}
                <MenuItem
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Glossário"
                  onClick={() => navigate("/glossario")}
                />
              </div>

              {/* Logout */}
              <div className="rounded-xl border border-border bg-surface-raised/50 mb-6">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-red-500"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Sair da conta</span>
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <AccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        user={user}
      />
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 active:bg-surface-raised transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-foreground">
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
