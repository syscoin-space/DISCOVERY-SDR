"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  ArrowRight,
  Zap,
  ClipboardList,
  Clock,
  AlertTriangle,
  Target,
  TrendingDown,
  Star,
  CalendarCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useUnreadCount,
  useNotificationPreview,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/use-notifications";
import type { AppNotification } from "@/hooks/use-notifications";
import { useRouter } from "next/navigation";

const TIPO_ICONS: Record<string, LucideIcon> = {
  proximo_contato: Clock,
  step_atrasado: ClipboardList,
  tier_a_parado: Zap,
  bloqueio: AlertTriangle,
  meta_batida: Target,
  ritmo_ruim: TrendingDown,
  sdr_destaque: Star,
  reuniao_agendada: CalendarCheck,
};

const TIPO_COLORS: Record<string, string> = {
  tier_a_parado: "text-red-500",
  step_atrasado: "text-orange-500",
  proximo_contato: "text-amber-500",
  reuniao_agendada: "text-emerald-500",
  bloqueio: "text-orange-500",
  meta_batida: "text-emerald-500",
  ritmo_ruim: "text-red-500",
  sdr_destaque: "text-yellow-500",
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const unreadCount = useUnreadCount();
  const { data: preview } = useNotificationPreview();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  const notifications = preview?.data ?? [];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.lida) markRead.mutate(n.id);
    if (n.url) {
      router.push(n.url);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
        title="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[360px] rounded-xl border border-border bg-surface shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold text-foreground">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[11px] text-accent hover:text-accent-hover font-medium transition-colors"
              >
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma notificação
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border/50 transition-colors ${
                    !n.lida
                      ? "bg-accent/5 hover:bg-accent/10"
                      : "opacity-60 hover:bg-surface-raised"
                  }`}
                >
                  {(() => {
                    const Icon = TIPO_ICONS[n.tipo] ?? Bell;
                    return <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${TIPO_COLORS[n.tipo] ?? "text-muted-foreground"}`} />;
                  })()}
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

          {/* Footer */}
          <div className="border-t border-border">
            <button
              onClick={() => {
                router.push("/notificacoes");
                setOpen(false);
              }}
              className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium text-accent hover:bg-accent/5 transition-colors"
            >
              Ver todas as notificações
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
