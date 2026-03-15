"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import api from "@/lib/api/client";

interface PipelineMetrics {
  CONTA_FRIA: number;
  EM_PROSPECCAO: number;
  REUNIAO_AGENDADA: number;
  OPORTUNIDADE_QUALIFICADA: number;
  NUTRICAO: number;
  SEM_PERFIL: number;
}

interface SDRMetrics {
  total_leads: number;
  leads_hot: number;
  leads_warm: number;
  leads_cold: number;
  avg_prr_score: number;
  meetings_this_week: number;
  handoffs_this_month: number;
}

const STATUS_LABELS: Record<string, string> = {
  CONTA_FRIA: "Conta Fria",
  EM_PROSPECCAO: "Em Prospecção",
  REUNIAO_AGENDADA: "Reunião Agendada",
  OPORTUNIDADE_QUALIFICADA: "Oportunidade",
  NUTRICAO: "Nutrição",
  SEM_PERFIL: "Sem Perfil",
};

const STATUS_COLORS: Record<string, string> = {
  CONTA_FRIA: "#94A3B8",
  EM_PROSPECCAO: "#2E86AB",
  REUNIAO_AGENDADA: "#F59E0B",
  OPORTUNIDADE_QUALIFICADA: "#10B981",
  NUTRICAO: "#8B5CF6",
  SEM_PERFIL: "#EF4444",
};

export default function DashboardPage() {
  const [pipeline, setPipeline] = useState<PipelineMetrics | null>(null);
  const [sdr, setSdr] = useState<SDRMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pipeRes, sdrRes] = await Promise.all([
          api.get("/dashboard/pipeline"),
          api.get("/dashboard/sdr-metrics"),
        ]);
        setPipeline(pipeRes.data);
        setSdr(sdrRes.data);
      } catch {
        /* error silenciado para MVP */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const pipelineTotal =
    pipeline
      ? Object.values(pipeline).reduce((s, v) => s + v, 0)
      : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Métricas de prospecção SDR</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          label="Total Leads"
          value={sdr?.total_leads ?? 0}
          icon={<Users size={32} />}
        />
        <KPICard
          label="PRR Hot"
          value={sdr?.leads_hot ?? 0}
          icon={<TrendingUp size={32} />}
        />
        <KPICard
          label="Reuniões / Semana"
          value={sdr?.meetings_this_week ?? 0}
          icon={<Calendar size={32} />}
        />
        <KPICard
          label="Handoffs / Mês"
          value={sdr?.handoffs_this_month ?? 0}
          icon={<ArrowRight size={32} />}
        />
      </div>

      {/* Pipeline funnel */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Funil do Pipeline
        </h2>
        <div className="space-y-3">
          {pipeline &&
            (Object.entries(pipeline) as [string, number][]).map(
              ([status, count]) => {
                const pct = pipelineTotal > 0 ? (count / pipelineTotal) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <span className="font-medium text-foreground">
                        {count}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-border/50">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: STATUS_COLORS[status] ?? "#64748B",
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
        </div>
      </div>

      {/* Score averages */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            PRR Score Médio
          </p>
          <p className="mt-2 text-3xl font-bold text-accent">
            {sdr?.avg_prr_score?.toFixed(1) ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Leads Warm
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-500">
            {sdr?.leads_warm ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Leads Cold
          </p>
          <p className="mt-2 text-3xl font-bold text-muted-foreground">
            {sdr?.leads_cold ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {value}
          </p>
        </div>
        <div className="rounded-lg bg-accent/10 p-2 text-accent">
          {icon}
        </div>
      </div>
    </div>
  );
}
