"use client";

import Link from "next/link";
import { useCadences } from "@/hooks/use-cadences";
import { Plus, Zap, RotateCcw, Rocket, Mail, MessageCircle, Phone, Linkedin, Search, BellRing } from "lucide-react";
import type { CadencePurpose, StepChannel } from "@/lib/types";

const PURPOSE_CONFIG: Record<CadencePurpose, { label: string; icon: any; color: string }> = {
  DISCOVERY: { label: "Discovery", icon: Search, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
  PROSPECCAO: { label: "Prospecção", icon: Rocket, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  NUTRICAO: { label: "Nutrição", icon: RotateCcw, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  CONFIRMACAO: { label: "Confirmação", icon: BellRing, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
};

const CHANNEL_ICON: Record<StepChannel, { icon: any; color: string }> = {
  EMAIL: { icon: Mail, color: "text-blue-500" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-500" },
  LIGACAO: { icon: Phone, color: "text-amber-500" },
  LINKEDIN: { icon: Linkedin, color: "text-blue-700 dark:text-blue-400" },
};

export default function CadenciasPage() {
  const { data: cadences, isLoading, error } = useCadences();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando cadencias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-6 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Erro ao carregar cadencias</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cadências de Engajamento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e gerencie fluxos de contato automáticos e manuais.
          </p>
        </div>
        <Link
          href="/cadencias/nova"
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nova Cadência
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {!cadences?.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/10 mb-6 group transform transition-transform hover:rotate-12 duration-500">
              <Zap className="h-10 w-10 text-accent group-hover:fill-accent transition-all" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Aumente sua produtividade</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Crie sequências de passos (Email, WhatsApp, Ligação) para guiar seus SDRs no dia a dia.
            </p>
            <Link
              href="/cadencias/nova"
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/25 hover:bg-accent-hover transition-all"
            >
              <Plus className="h-5 w-5" />
              Criar Primeira Cadência
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cadences.map((cadence) => {
              const purposeConf = PURPOSE_CONFIG[cadence.purpose] || PURPOSE_CONFIG.PROSPECCAO;
              const PurposeIcon = purposeConf.icon;
              const enrolledCount = (cadence as any)._count?.enrollments ?? 0;
              const steps = cadence.steps ?? [];

              return (
                <Link
                  key={cadence.id}
                  href={`/cadencias/${cadence.id}`}
                  className="group flex flex-col rounded-2xl border border-border/60 bg-surface p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-accent/40 hover:-translate-y-1"
                >
                  {/* Type badge + name */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate group-hover:text-accent transition-colors">
                        {cadence.name}
                      </h3>
                      {cadence.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {cadence.description}
                        </p>
                      )}
                    </div>
                    <span className={`ml-3 flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${purposeConf.color}`}>
                      <PurposeIcon className="h-3 w-3" />
                      {purposeConf.label}
                    </span>
                  </div>

                  {/* Steps timeline */}
                  <div className="flex items-center gap-1.5 mb-5 mt-2 overflow-x-hidden">
                    {steps.slice(0, 6).map((step, i) => {
                      const ch = CHANNEL_ICON[step.channel as StepChannel] || CHANNEL_ICON.EMAIL;
                      const ChIcon = ch.icon;
                      return (
                        <div key={step.id ?? i} className="flex items-center shrink-0">
                          <div 
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-raised border border-border/40 shadow-sm group-hover:border-accent/20 group-hover:bg-accent/5 transition-colors" 
                            title={`Dia ${step.day_offset} - ${step.channel}`}
                          >
                            <ChIcon className={`h-3.5 w-3.5 ${ch.color}`} />
                          </div>
                          {i < Math.min(steps.length - 1, 5) && (
                            <div className="w-2 h-[1px] bg-border/50" />
                          )}
                          {i === 5 && steps.length > 6 && (
                            <span className="text-[10px] text-muted-foreground ml-1">+{steps.length - 6}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer stats */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Passos</span>
                      <span className="text-xs font-semibold text-foreground">{steps.length} etapas</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Inscritos</span>
                      <span className="text-xs font-semibold text-foreground">{enrolledCount} leads</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
