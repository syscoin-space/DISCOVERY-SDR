"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import type { AppNotification } from "@/hooks/use-notifications";
import { useRouter } from "next/navigation";

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
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: notifications } = useNotifications();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  const unreadCount = notifications?.filter((n) => !n.lida).length ?? 0;

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
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[11px] text-blue-500 hover:text-blue-600 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {!notifications?.length ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Nenhuma notificação
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    !n.lida
                      ? "bg-blue-50/50 dark:bg-blue-500/5 border-l-2 border-l-blue-500"
                      : "opacity-70"
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {TIPO_ICONS[n.tipo] || "\uD83D\uDD14"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {n.titulo}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.corpo}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
                    {timeAgo(n.enviada_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
