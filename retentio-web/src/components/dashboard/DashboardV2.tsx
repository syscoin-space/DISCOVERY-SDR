"use client";

import { useDashboardV2Metrics } from "@/lib/api/dashboard.v2.api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  BarChart3, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  Users, 
  ArrowUpRight, 
  Activity, 
  MessageSquareShare,
  ShieldCheck,
  BrainCircuit,
  PencilRuler
} from "lucide-react";

export function DashboardV2() {
  const { data, isLoading, error } = useDashboardV2Metrics();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-red-400">
        Ocorreu um erro ao carregar o dashboard. Tente novamente.
      </div>
    );
  }

  const { operational, discovery, ai_hil } = data;

  return (
    <div className="space-y-8 pb-12">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" /> Comando Operacional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas de Vendas, Discovery e Inteligência Artificial ({format(new Date(), "MMMM yyyy", { locale: ptBR })})
          </p>
        </div>
      </div>

      {/* ── 1. Operational Tier ── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> 1. Operação & Pipeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total de Leads" 
            value={operational.total_leads} 
            icon={<Users className="w-4 h-4 text-blue-400" />} 
          />
          <StatCard 
            title="Leads Qualificados" 
            value={operational.qualified_leads} 
            icon={<Target className="w-4 h-4 text-green-400" />} 
            subtitle={`Conversão: ${operational.conversion_rate.toFixed(1)}%`}
          />
          <StatCard 
            title="Handoffs do Mês" 
            value={operational.recent_handoffs} 
            icon={<ArrowUpRight className="w-4 h-4 text-purple-400" />} 
          />
          <StatCard 
            title="Conclusão de Tarefas" 
            value={`${operational.task_completion_rate.toFixed(0)}%`} 
            icon={<CheckCircle2 className="w-4 h-4 text-accent" />} 
          />
        </div>
      </section>

      {/* ── 2. Discovery Tier ── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 mt-8 flex items-center gap-2">
          <MessageSquareShare className="w-4 h-4" /> 2. Eficiência de Discovery
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm col-span-1">
            <h3 className="text-sm text-muted-foreground font-medium mb-1">Taxa de Decisores Encontrados</h3>
            <div className="text-3xl font-bold text-foreground mb-4">
              {discovery.discovery_completion_rate.toFixed(1)}%
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2">
              <div 
                className="bg-accent h-2 rounded-full" 
                style={{ width: `${Math.min(discovery.discovery_completion_rate, 100)}%` }} 
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {discovery.leads_with_dm} leads com DM identificado.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm col-span-2">
            <h3 className="text-sm text-muted-foreground font-medium mb-4">Outcomes Map (Últimos Touchpoints)</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(discovery.outcomes_distribution).map(([outcome, count]) => (
                <div key={outcome} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-medium text-muted-foreground">{outcome.replace(/_/g, " ")}:</span>
                  <span className="text-sm font-bold text-foreground">{count}</span>
                </div>
              ))}
              {Object.keys(discovery.outcomes_distribution).length === 0 && (
                <span className="text-sm text-muted-foreground italic">Nenhum outcome registrado ainda.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. AI / HIL Tier ── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 mt-8 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" /> 3. Human-in-the-Loop (Adoção de IA)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm text-muted-foreground font-medium">Adoção vs Rejeição Ativa</h3>
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold text-foreground">{ai_hil.adoption_rate.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground mb-1">de aceite real</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Mede quantas sugestões foram aprovadas pelo humano (com ou sem edições) vs rejeitadas explicitamente.
            </p>
            
            {/* Simple stacked bar */}
            <div className="w-full flex h-3 rounded-full overflow-hidden bg-neutral-800">
              <div 
                className="bg-green-500" 
                style={{ width: `${(ai_hil.accepted_clean / Math.max(ai_hil.total_interactions, 1)) * 100}%` }} 
                title="Aceito (Limpo)"
              />
              <div 
                className="bg-amber-500" 
                style={{ width: `${(ai_hil.edited_then_accepted / Math.max(ai_hil.total_interactions, 1)) * 100}%` }}
                title="Editado e Aceito"
              />
              <div 
                className="bg-red-500" 
                style={{ width: `${(ai_hil.rejected / Math.max(ai_hil.total_interactions, 1)) * 100}%` }}
                title="Rejeitado"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground uppercase font-bold">
              <span className="text-green-500">Limpo</span>
              <span className="text-amber-500">Editado</span>
              <span className="text-red-500">Descártado</span>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
             <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col justify-center">
                <ShieldCheck className="w-5 h-5 text-green-500 mb-2" />
                <span className="text-2xl font-bold text-foreground">{ai_hil.accepted_clean}</span>
                <span className="text-xs font-medium text-muted-foreground mt-1">Copilot Aceito (0 Edições)</span>
             </div>
             <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col justify-center">
                <PencilRuler className="w-5 h-5 text-amber-500 mb-2" />
                <span className="text-2xl font-bold text-foreground">{ai_hil.edited_then_accepted}</span>
                <span className="text-xs font-medium text-muted-foreground mt-1">Insights Editados (Co-Criação)</span>
             </div>
             <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col justify-center col-span-2 mt-auto">
                <span className="text-xs font-medium text-muted-foreground">Volume de Auditoria IA:</span>
                <span className="text-sm text-foreground my-1">
                  <strong>{ai_hil.total_interactions} interações totais</strong> passaram por revisão humana neste período.
                </span>
             </div>
          </div>

        </div>
      </section>

    </div>
  );
}

function StatCard({ title, value, icon, subtitle }: { title: string; value: string | number; icon: React.ReactNode; subtitle?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
