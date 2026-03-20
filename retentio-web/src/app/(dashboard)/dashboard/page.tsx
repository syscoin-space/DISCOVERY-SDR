"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";
import api from "@/lib/api/client";
import { FUNNEL_COLUMNS, type LeadStatus } from "@/lib/types";

interface PipelineMetrics {
  [key: string]: number;
}

interface SDRMetrics {
  total_leads: number;
  leads_hot: number;
  activities_this_week: number;
  handoffs_this_month: number;
}

// Removido STATUS_LABELS e STATUS_COLORS em favor de FUNNEL_COLUMNS (index.ts)

export default function DashboardPage() {
  const [pipeline, setPipeline] = useState<PipelineMetrics | null>(null);
  const [sdr, setSdr] = useState<SDRMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pipeRes, statsRes] = await Promise.all([
          api.get("/dashboard/pipeline"),
          api.get("/dashboard/stats"),
        ]);
        setPipeline(pipeRes.data);
        setSdr(statsRes.data);
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
          label="Leads Hot (8+)"
          value={sdr?.leads_hot ?? 0}
          icon={<TrendingUp size={32} />}
        />
        <KPICard
          label="Atividades / Semana"
          value={sdr?.activities_this_week ?? 0}
          icon={<CheckCircle2 size={32} />}
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
        <div className="space-y-4">
          {pipeline &&
            FUNNEL_COLUMNS.map((col) => {
                const count = pipeline[col.status] ?? 0;
                const pct = pipelineTotal > 0 ? (count / pipelineTotal) * 100 : 0;
                return (
                  <div key={col.status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        {col.label}
                      </span>
                      <span className="font-bold text-foreground">
                        {count}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-border/20">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: col.color,
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
      {/* Placeholder para futuras métricas de performance */}
      <div className="mt-8 p-12 border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center opacity-40">
        <TrendingUp className="h-10 w-10 mb-2" />
        <p className="text-sm font-medium">Análise de Conversão (Em breve na V2)</p>
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
