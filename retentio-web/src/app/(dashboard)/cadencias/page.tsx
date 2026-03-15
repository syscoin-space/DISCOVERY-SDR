"use client";

import Link from "next/link";
import { useCadences } from "@/hooks/use-cadences";
import { Plus, Zap, RotateCcw, Rocket, Mail, MessageCircle, Phone, Linkedin } from "lucide-react";
import type { CadenceType, StepChannel } from "@/lib/types";

const TYPE_CONFIG: Record<CadenceType, { label: string; icon: typeof Zap; color: string }> = {
  STANDARD: { label: "Standard", icon: Zap, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  REATIVACAO: { label: "Reativação", icon: RotateCcw, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  FAST_TRACK: { label: "Fast Track", icon: Rocket, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
};

const CHANNEL_ICON: Record<StepChannel, { icon: typeof Mail; color: string }> = {
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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cadencias</h1>
          <p className="text-sm text-muted-foreground">
            {cadences?.length ?? 0} cadencias configuradas
          </p>
        </div>
        <Link
          href="/cadencias/nova"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nova Cadencia
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {!cadences?.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-4">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Nenhuma cadência ainda</h2>
            <p className="text-sm text-muted-foreground mb-4">Crie sua primeira cadência de prospecção</p>
            <Link
              href="/cadencias/nova"
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Criar Cadencia
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cadences.map((cadence) => {
              const typeConf = TYPE_CONFIG[cadence.type];
              const TypeIcon = typeConf.icon;
              const enrolledCount = (cadence as unknown as { _count?: { lead_cadences?: number } })._count?.lead_cadences ?? 0;
              const steps = cadence.steps ?? [];

              return (
                <Link
                  key={cadence.id}
                  href={`/cadencias/${cadence.id}`}
                  className="group flex flex-col rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-accent/30"
                >
                  {/* Type badge + name */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                        {cadence.name}
                      </h3>
                      {cadence.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cadence.description}</p>
                      )}
                    </div>
                    <span className={`ml-2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeConf.color}`}>
                      <TypeIcon className="h-3 w-3" />
                      {typeConf.label}
                    </span>
                  </div>

                  {/* Steps timeline */}
                  {steps.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      {steps.map((step, i) => {
                        const ch = CHANNEL_ICON[step.channel];
                        const ChIcon = ch.icon;
                        return (
                          <div key={step.id ?? i} className="flex items-center">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-raised" title={`Dia ${step.day_offset} - ${step.channel}`}>
                              <ChIcon className={`h-3 w-3 ${ch.color}`} />
                            </div>
                            {i < steps.length - 1 && (
                              <div className="w-3 h-px bg-border" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer stats */}
                  <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-auto">
                    <span className="text-xs text-muted-foreground">
                      {steps.length} {steps.length === 1 ? "step" : "steps"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {enrolledCount} {enrolledCount === 1 ? "lead inscrito" : "leads inscritos"}
                    </span>
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
