"use client";

import { useGestorSdrs } from "@/hooks/use-gestor";
import { Users, Mail, Phone, Calendar, ArrowRightLeft, Zap } from "lucide-react";

export default function GestorSdrsPage() {
  const { data: sdrs, isLoading } = useGestorSdrs();

  if (isLoading || !sdrs) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">SDRs</h1>
          <p className="text-sm text-muted-foreground">{sdrs.length} SDR{sdrs.length !== 1 ? "s" : ""} ativo{sdrs.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sdrs.map((sdr) => (
              <div
                key={sdr.id}
                className="rounded-xl border border-border bg-surface p-5 space-y-4"
              >
                {/* SDR Header */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {sdr.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{sdr.name}</p>
                    <p className="text-xs text-muted-foreground">{sdr.email}</p>
                  </div>
                </div>

                {/* Today Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Progresso Hoje</span>
                    <span className="text-xs font-medium text-foreground">
                      {sdr.today_done}/{sdr.today_tasks} ({sdr.today_completion_pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sdr.today_completion_pct >= 80
                          ? "bg-emerald-500"
                          : sdr.today_completion_pct >= 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${sdr.today_completion_pct}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <MetricBadge
                    icon={<Users className="h-3.5 w-3.5" />}
                    label="Leads"
                    value={sdr.total_leads}
                  />
                  <MetricBadge
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label="Reuniões"
                    value={sdr.week_meetings}
                    sub="semana"
                  />
                  <MetricBadge
                    icon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                    label="Handoffs"
                    value={sdr.month_handoffs}
                    sub="mês"
                  />
                  <MetricBadge
                    icon={<Zap className="h-3.5 w-3.5" />}
                    label="Cadências"
                    value={sdr.active_cadences}
                    sub="ativas"
                  />
                </div>
              </div>
            ))}
          </div>

          {sdrs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum SDR cadastrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBadge({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-surface-raised p-2 text-center">
      <div className="flex justify-center mb-1 text-muted-foreground">{icon}</div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub ?? label}</p>
    </div>
  );
}
