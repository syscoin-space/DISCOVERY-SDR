"use client";

import { useState, useEffect } from "react";
import { Bell, ArrowRight } from "lucide-react";
import { Drawer } from "vaul";
import { useRouter } from "next/navigation";
import { useBrand } from "@/hooks/use-brand";
import {
  useUnreadCount,
  useNotificationPreview,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/use-notifications";
import type { AppNotification } from "@/hooks/use-notifications";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ProfileSheet } from "./ProfileSheet";

interface StoredUser {
  name: string;
  role: string;
  email: string;
  avatar_url?: string | null;
}

const TIPO_ICONS: Record<string, string> = {
  proximo_contato: "\u23F0",
  step_atrasado: "\uD83D\uDCCB",
  tier_a_parado: "\u26A1",
  bloqueio: "\u26A0\uFE0F",
  meta_batida: "\uD83C\uDFAF",
  ritmo_ruim: "\uD83D\uDCC9",
  sdr_destaque: "\u2B50",
  reuniao_agendada: "\uD83D\uDCC5",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `há ${days}d`;
}

export function MobileHeader() {
  const { data: brand } = useBrand();
  const unreadCount = useUnreadCount();
  const { data: preview } = useNotificationPreview();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("retentio_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const appName = brand?.app_name ?? "Retentio";
  const logoUrl = brand?.logo_url;
  const notifications = preview?.data ?? [];

  const handleNotifClick = (n: AppNotification) => {
    if (!n.lida) markRead.mutate(n.id);
    if (n.url) {
      setNotifOpen(false);
      router.push(n.url);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden">
        <div className="pt-safe" />
        <div className="flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="object-contain"
                style={{ height: 28, width: "auto", maxWidth: 140, borderRadius: 4 }}
              />
            ) : (
              <>
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${brand?.color_accent ?? "#2E86AB"}, ${brand?.color_green ?? "#1A7A5E"})`,
                  }}
                >
                  {appName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  {appName}
                </span>
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Notification bell — opens bottom sheet */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-surface-raised"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <button
              onClick={() => setProfileOpen(true)}
              className="transition-transform active:scale-95"
            >
              <UserAvatar
                name={user?.name ?? ""}
                avatarUrl={user?.avatar_url}
                size="md"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Notification Bottom Sheet */}
      <Drawer.Root open={notifOpen} onOpenChange={setNotifOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-surface outline-none max-h-[80vh]">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-4 pb-3">
              <Drawer.Title className="text-base font-bold text-foreground">
                Notificações
              </Drawer.Title>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-accent font-medium"
                >
                  Marcar todas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border-t border-border">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma notificação
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border/50 transition-colors active:bg-surface-raised ${
                      !n.lida ? "bg-accent/5" : "opacity-60"
                    }`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">
                      {TIPO_ICONS[n.tipo] || "\uD83D\uDD14"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {n.titulo}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {n.corpo}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {timeAgo(n.enviada_at)}
                      </p>
                    </div>
                    {!n.lida && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-accent shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-border pb-safe">
              <button
                onClick={() => {
                  setNotifOpen(false);
                  router.push("/notificacoes");
                }}
                className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium text-accent active:bg-accent/5"
              >
                Ver todas as notificações
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
      />
    </>
  );
}
