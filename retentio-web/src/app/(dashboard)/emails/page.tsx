"use client";

import { useState } from "react";
import { useEmailAudit, useEmailStats } from "@/hooks/use-resend";
import {
  Mail,
  MailOpen,
  MousePointerClick,
  Send,
  Ban,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { EmailAuditItem } from "@/lib/types";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  sent: { label: "Enviado", icon: Send, color: "text-gray-500 bg-gray-500/10" },
  delivered: { label: "Entregue", icon: CheckCircle2, color: "text-accent bg-accent/10" },
  opened: { label: "Aberto", icon: MailOpen, color: "text-green-500 bg-green-500/10" },
  clicked: { label: "Clicado", icon: MousePointerClick, color: "text-purple-500 bg-purple-500/10" },
  bounced: { label: "Bounce", icon: Ban, color: "text-red-500 bg-red-500/10" },
  complained: { label: "Spam", icon: AlertTriangle, color: "text-orange-500 bg-orange-500/10" },
  failed: { label: "Falhou", icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
};

export default function EmailsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: result, isLoading } = useEmailAudit({
    page,
    status: statusFilter || undefined,
  });
  const { data: stats } = useEmailStats(30);

  const emails = result?.data ?? [];
  const meta = result?.meta;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Auditoria de Emails</h1>
          <p className="text-sm text-muted-foreground">
            Tracking completo: envio, abertura, cliques
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MiniStat label="Enviados" value={stats.total_sent} color="text-gray-600" />
              <MiniStat label="Entregues" value={stats.delivered} color="text-accent" />
              <MiniStat
                label="Abertos"
                value={`${stats.opened} (${stats.open_rate}%)`}
                color="text-green-600"
              />
              <MiniStat
                label="Clicados"
                value={`${stats.clicked} (${stats.click_rate}%)`}
                color="text-purple-600"
              />
              <MiniStat
                label="Bounce"
                value={`${stats.bounced} (${stats.bounce_rate}%)`}
                color="text-red-600"
              />
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtrar:</span>
            {["", "sent", "delivered", "opened", "clicked", "bounced"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-accent text-white"
                    : "bg-surface-raised text-muted-foreground hover:bg-accent/10"
                }`}
              >
                {s === "" ? "Todos" : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>

          {/* Email List */}
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-4">
                <Mail className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Nenhum email encontrado</h2>
              <p className="text-sm text-muted-foreground">
                Os emails enviados pelas cadências aparecerão aqui com status de tracking
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <EmailRow key={email.id} email={email} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface-raised disabled:opacity-40"
              >
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <span className="text-xs text-muted-foreground">
                Página {page} de {meta.pages}
              </span>
              <button
                onClick={() => setPage(Math.min(meta.pages, page + 1))}
                disabled={page === meta.pages}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface-raised disabled:opacity-40"
              >
                Próxima <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailRow({ email }: { email: EmailAuditItem }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = STATUS_CONFIG[email.status ?? "sent"] ?? STATUS_CONFIG.sent;
  const StatusIcon = statusInfo.icon;

  // Build timeline from events
  const timeline = email.email_events ?? [];

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden transition-all hover:border-accent/30">
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left"
      >
        {/* Status icon */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusInfo.color}`}>
          <StatusIcon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {email.subject ?? "(sem assunto)"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground truncate">
              → {email.lead.contact_name ?? email.lead.company_name}
              {email.lead.email && ` (${email.lead.email})`}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <span className={`flex items-center gap-1 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </span>

        {/* Date */}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {new Date(email.created_at).toLocaleDateString("pt-BR")}{" "}
          {new Date(email.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </button>

      {/* Expanded: Event Timeline */}
      {expanded && (
        <div className="border-t border-border/50 bg-surface-raised px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Timeline de eventos
          </p>
          {timeline.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Nenhum evento registrado ainda — os webhooks do Resend atualizarão aqui
            </p>
          ) : (
            <div className="space-y-1.5">
              {timeline.map((ev) => {
                const evInfo = STATUS_CONFIG[ev.type.replace("email.", "")] ?? {
                  label: ev.type,
                  icon: Clock,
                  color: "text-gray-500 bg-gray-500/10",
                };
                const EvIcon = evInfo.icon;
                return (
                  <div key={ev.id} className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded ${evInfo.color}`}>
                      <EvIcon className="h-3 w-3" />
                    </div>
                    <span className="text-xs text-foreground">{evInfo.label}</span>
                    {(ev as any).link && (
                      <a
                        href={(ev as any).link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {(ev as any).link.slice(0, 40)}...
                      </a>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(ev.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
