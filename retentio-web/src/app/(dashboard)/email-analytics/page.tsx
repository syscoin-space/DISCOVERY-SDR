"use client";

import { useEmailMetrics, useCadencePerformance } from "@/hooks/use-email-metrics";
import { useEmailHealth } from "@/hooks/use-email-health";
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  MailOpen, 
  MousePointerClick, 
  Zap, 
  TrendingUp, 
  Activity,
  BarChart3,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function EmailAnalyticsPage() {
  const { data: metrics, isLoading: loadingMetrics } = useEmailMetrics();
  const { data: cadences, isLoading: loadingCadences } = useCadencePerformance();
  const { data: health, isLoading: loadingHealth } = useEmailHealth();

  if (loadingMetrics || loadingCadences || loadingHealth) {
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
          <h1 className="text-xl font-bold text-foreground">Analytics de E-mail</h1>
          <p className="text-sm text-muted-foreground">
            Performance e saúde operacional do canal por tenant
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Health Status Banner */}
          {health && (
            <div className={`rounded-xl border p-4 mb-2 flex items-start gap-4 ${
              health.status === 'HEALTHY' ? 'bg-green-500/5 border-green-500/20' :
              health.status === 'WARNING' ? 'bg-amber-500/5 border-amber-500/20' :
              health.status === 'CRITICAL' ? 'bg-red-500/5 border-red-500/20' :
              'bg-muted/5 border-border'
            }`}>
              <div className={`p-2 rounded-lg ${
                health.status === 'HEALTHY' ? 'text-green-500' :
                health.status === 'WARNING' ? 'text-amber-500' :
                health.status === 'CRITICAL' ? 'text-red-500' :
                'text-muted-foreground'
              }`}>
                {health.status === 'HEALTHY' ? <CheckCircle className="h-6 w-6" /> :
                 health.status === 'CRITICAL' ? <XCircle className="h-6 w-6" /> :
                 <AlertCircle className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-foreground">Status do Canal: {
                    health.status === 'HEALTHY' ? 'Saudável' :
                    health.status === 'WARNING' ? 'Atenção' :
                    health.status === 'CRITICAL' ? 'Crítico (Bloqueado)' :
                    'Inativo'
                  }</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Último sucesso: {health.last_success_at ? format(new Date(health.last_success_at), "HH:mm") : 'Nunca'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {health.issues.map((issue, idx) => (
                    <span key={idx} className="text-[10px] bg-background/50 border border-border/50 px-2 py-0.5 rounded text-muted-foreground">
                      • {issue}
                    </span>
                  ))}
                  {health.issues.length === 0 && (
                    <span className="text-[10px] text-green-600 font-medium">Todos os sistemas operacionais. Suas cadências estão rodando normalmente.</span>
                  )}
                </div>
              </div>
              {health.status !== 'HEALTHY' && (
                <Link 
                  href="/settings/email"
                  className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors shrink-0"
                >
                  Corrigir Configurações
                </Link>
              )}
            </div>
          )}
          
          {/* Global KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              label="E-mails Enviados" 
              value={metrics?.totalSent ?? 0} 
              icon={Send} 
              color="text-gray-500" 
            />
            <MetricCard 
              label="Taxa de Entrega" 
              value={`${metrics?.deliveryRate.toFixed(1)}%`} 
              subValue={`${metrics?.totalDelivered} entregues`}
              icon={CheckCircle2} 
              color="text-accent" 
            />
            <MetricCard 
              label="Taxa de Abertura" 
              value={`${metrics?.openRate.toFixed(1)}%`} 
              subValue={`${metrics?.totalOpened} aberturas`}
              icon={MailOpen} 
              color="text-green-500" 
            />
            <MetricCard 
              label="Taxa de Cliques" 
              value={`${metrics?.clickRate.toFixed(1)}%`} 
              subValue={`${metrics?.totalClicked} cliques`}
              icon={MousePointerClick} 
              color="text-purple-500" 
            />
          </div>

          {/* Cadence Performance Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold text-foreground">Performance por Cadência</h2>
            </div>

            {!cadences?.length ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground italic">Nenhuma cadência ativa encontrada para este tenant.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-muted-foreground">Cadência</th>
                      <th className="px-6 py-3 font-semibold text-muted-foreground text-center">Enviados</th>
                      <th className="px-6 py-3 font-semibold text-muted-foreground text-center">Abertura</th>
                      <th className="px-6 py-3 font-semibold text-muted-foreground text-center">Cliques</th>
                      <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cadences.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{c.purpose}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-foreground">
                          {c.metrics.totalSent}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-green-600">{c.metrics.openRate.toFixed(1)}%</div>
                          <div className="text-[10px] text-muted-foreground">{c.metrics.totalOpened} abertivos</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-purple-600">{c.metrics.clickRate.toFixed(1)}%</div>
                          <div className="text-[10px] text-muted-foreground">{c.metrics.totalClicked} cliques</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href={`/cadencias/${c.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                          >
                            Ver mais <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity Info */}
          {metrics?.lastActivityAt && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/5 p-4 border border-accent/10">
              <Activity className="h-4 w-4 text-accent" />
              <p className="text-xs text-muted-foreground">
                Último evento de rastreamento recebido em: <span className="font-semibold text-foreground">{format(new Date(metrics.lastActivityAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon: any; 
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-2 group hover:border-accent/40 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg bg-surface-raised border border-border group-hover:border-accent/20 transition-all`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {subValue && <span className="text-[10px] text-muted-foreground font-medium">{subValue}</span>}
      </div>
    </div>
  );
}
