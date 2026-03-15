"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/use-notifications";
import type { AppNotification } from "@/hooks/use-notifications";

const TIPO_ICONS: Record<string, string> = {
  tier_a_parado: "\u26A1",
  step_atrasado: "\uD83D\uDCCB",
  proximo_contato: "\u23F0",
  reuniao_agendada: "\uD83D\uDCC5",
  bloqueio: "\u26A0\uFE0F",
  meta_batida: "\uD83C\uDFAF",
  ritmo_ruim: "\uD83D\uDCC9",
  sdr_destaque: "\u2B50",
};

const TIPO_COLORS: Record<string, string> = {
  tier_a_parado: "text-red-500 bg-red-500/10",
  step_atrasado: "text-orange-500 bg-orange-500/10",
  proximo_contato: "text-amber-500 bg-amber-500/10",
  reuniao_agendada: "text-emerald-500 bg-emerald-500/10",
  bloqueio: "text-orange-500 bg-orange-500/10",
  meta_batida: "text-emerald-500 bg-emerald-500/10",
  ritmo_ruim: "text-red-500 bg-red-500/10",
  sdr_destaque: "text-yellow-500 bg-yellow-500/10",
};

const TIPO_LABELS: Record<string, string> = {
  tier_a_parado: "Lead Tier A",
  step_atrasado: "Cadência",
  proximo_contato: "Contato",
  reuniao_agendada: "Reunião",
  bloqueio: "Bloqueio",
  meta_batida: "Meta",
  ritmo_ruim: "Performance",
  sdr_destaque: "Destaque",
};

type FilterTab = "todas" | "nao_lidas" | "leads" | "cadencias" | "gestor";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "nao_lidas", label: "Não lidas" },
  { key: "leads", label: "Leads" },
  { key: "cadencias", label: "Cadências" },
  { key: "gestor", label: "Gestor" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export default function NotificacoesPage() {
  const router = useRouter();
  const unreadCount = useUnreadCount();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  const [activeTab, setActiveTab] = useState<FilterTab>("todas");
  const [page, setPage] = useState(1);

  // Build query params based on active tab
  const queryParams: Record<string, string | number> = { page, limit: 20 };
  if (activeTab === "nao_lidas") queryParams.lida = "false";
  if (activeTab === "leads") queryParams.tipo = "leads";
  if (activeTab === "cadencias") queryParams.tipo = "cadencias";
  if (activeTab === "gestor") queryParams.tipo = "gestor";

  const { data, isLoading } = useNotifications(queryParams as any);
  const notifications = data?.data ?? [];
  const meta = data?.meta;

  function handleClick(n: AppNotification) {
    if (!n.lida) markRead.mutate(n.id);
    if (n.url) router.push(n.url);
  }

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    setPage(1);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`
              : "Tudo em dia"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border bg-surface px-6 py-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-accent text-white"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <h3 className="text-base font-semibold text-foreground">
              Nenhuma notificação ainda
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              Quando houver alertas de leads ou metas, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const iconColor = TIPO_COLORS[n.tipo] ?? "text-gray-500 bg-gray-500/10";
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-6 py-4 flex items-start gap-4 transition-colors ${
                    !n.lida
                      ? "bg-accent/5 border-l-2 border-l-accent hover:bg-accent/10"
                      : "bg-surface opacity-70 hover:bg-surface-raised border-l-2 border-l-transparent"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${iconColor}`}
                  >
                    {TIPO_ICONS[n.tipo] || "\uD83D\uDD14"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold text-foreground ${n.lida ? "" : ""}`}>
                        {n.titulo}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {timeAgo(n.enviada_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {n.corpo}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${iconColor}`}
                      >
                        {TIPO_LABELS[n.tipo] ?? n.tipo}
                      </span>
                      {n.url && (
                        <span className="flex items-center gap-0.5 text-[10px] text-accent font-medium">
                          Ir
                          <ArrowRight className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-border py-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} de {meta.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
