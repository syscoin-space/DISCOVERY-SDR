"use client";

import { useGestorDashboard } from "@/hooks/use-gestor";
import { FUNNEL_COLUMNS } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Users, Calendar, ArrowRightLeft } from "lucide-react";

export default function GestorDashboardPage() {
  const { data, isLoading } = useGestorDashboard();

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const { today, week, funnel, sdr_summaries, alerts } = data;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel do Gestor</h1>
          <p className="text-sm text-muted-foreground">Visão geral da equipe</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Tarefas Hoje"
              value={today.total_tasks}
              sub={`${today.completion_pct}% concluído`}
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            />
            <KpiCard
              label="Pendentes"
              value={today.pending}
              sub="aguardando execução"
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
            />
            <KpiCard
              label="Reuniões (semana)"
              value={week.meetings}
              sub="agendadas esta semana"
              icon={<Calendar className="h-5 w-5 text-blue-500" />}
            />
            <KpiCard
              label="Handoffs (semana)"
              value={week.handoffs}
              sub="enviados esta semana"
              icon={<ArrowRightLeft className="h-5 w-5 text-purple-500" />}
            />
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas ({alerts.length})
              </h2>
              {alerts.map((alert, i) => (
                <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
                  {alert.message}
                </p>
              ))}
            </div>
          )}

          {/* Funnel */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Funil de Leads</h2>
            <div className="grid grid-cols-6 gap-3">
              {FUNNEL_COLUMNS.map((col) => {
                const raw = funnel[col.status];
                const count = typeof raw === "number" ? raw : 0;
                return (
                  <div key={col.status} className="text-center">
                    <div
                      className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
                      style={{ backgroundColor: col.color }}
                    >
                      {count}
                    </div>
                    <p className="text-xs text-muted-foreground">{col.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SDR Activity Table */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Atividade da Equipe Hoje
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">SDR</th>
                    <th className="pb-2 font-medium text-center">Total</th>
                    <th className="pb-2 font-medium text-center">Feitas</th>
                    <th className="pb-2 font-medium text-center">Pendentes</th>
                    <th className="pb-2 font-medium text-center">Conclusão</th>
                  </tr>
                </thead>
                <tbody>
                  {sdr_summaries.map((sdr) => (
                    <tr key={sdr.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 font-medium text-foreground">{sdr.name}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{sdr.total}</td>
                      <td className="py-2.5 text-center text-emerald-500 font-medium">{sdr.done}</td>
                      <td className="py-2.5 text-center text-amber-500">{sdr.pending}</td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-surface-raised overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{ width: `${sdr.completion_pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{sdr.completion_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
