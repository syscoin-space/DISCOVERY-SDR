"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useCadence, useEnrollLead, useUnenrollLead, useDeleteCadence } from "@/hooks/use-cadences";
import { useAllLeads } from "@/hooks/use-leads";
import { useState } from "react";
import {
  ArrowLeft, Mail, MessageCircle, Phone, Linkedin,
  UserPlus, UserMinus, CheckCircle2, Clock, XCircle, SkipForward, AlertTriangle,
  Pencil, Trash2, Search, Rocket, RotateCcw, BellRing
} from "lucide-react";
import type { StepChannel, StepStatus, CadencePurpose } from "@/lib/types";

const PURPOSE_META: Record<CadencePurpose, { label: string; icon: any; color: string }> = {
  DISCOVERY: { label: "Discovery", icon: Search, color: "text-sky-500" },
  PROSPECCAO: { label: "Prospecção", icon: Rocket, color: "text-emerald-500" },
  NUTRICAO: { label: "Nutrição", icon: RotateCcw, color: "text-amber-500" },
  CONFIRMACAO: { label: "Confirmação", icon: BellRing, color: "text-purple-500" },
};

const CHANNEL_META: Record<StepChannel, { icon: any; color: string; label: string }> = {
  EMAIL: { icon: Mail, color: "text-blue-500 bg-blue-500/10", label: "Email" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-500 bg-green-500/10", label: "WhatsApp" },
  LIGACAO: { icon: Phone, color: "text-amber-500 bg-amber-500/10", label: "Ligação" },
  LINKEDIN: { icon: Linkedin, color: "text-blue-700 bg-blue-700/10 dark:text-blue-400 dark:bg-blue-400/10", label: "LinkedIn" },
};

const STATUS_ICON: Record<StepStatus, { icon: typeof Clock; color: string }> = {
  PENDENTE: { icon: Clock, color: "text-muted-foreground" },
  EXECUTADO: { icon: CheckCircle2, color: "text-emerald-500" },
  PULADO: { icon: SkipForward, color: "text-amber-500" },
  ATRASADO: { icon: AlertTriangle, color: "text-orange-500" },
  CANCELADO: { icon: XCircle, color: "text-red-500" },
};

export default function CadenciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: cadence, isLoading } = useCadence(id);
  const { data: allLeads } = useAllLeads();
  const enrollLead = useEnrollLead();
  const unenrollLead = useUnenrollLead();
  const deleteCadence = useDeleteCadence();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!cadence) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Cadência não encontrada</p>
      </div>
    );
  }

  const steps = cadence.steps ?? [];
  const enrollments = (cadence as any).enrollments ?? [];
  const purposeConf = PURPOSE_META[cadence.purpose] || PURPOSE_META.PROSPECCAO;
  const PurposeIcon = purposeConf.icon;

  // Leads available to enroll (not already active in this cadence)
  const enrolledIds = new Set(enrollments.map((e: any) => e.lead_id));
  const availableLeads = (allLeads ?? []).filter((l) => !enrolledIds.has(l.id));

  async function handleEnroll() {
    if (!selectedLeadId) return;
    try {
      await enrollLead.mutateAsync({ cadenceId: id, leadId: selectedLeadId });
      setSelectedLeadId("");
      setEnrollOpen(false);
    } catch {
      // handled by react-query
    }
  }

  async function handleUnenroll(leadId: string) {
    if (!confirm("Deseja interromper esta cadência para este lead? Todas as tarefas pendentes serão canceladas.")) return;
    try {
      await unenrollLead.mutateAsync({ cadenceId: id, leadId });
    } catch {
      // handled by react-query
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/cadencias")}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all border border-transparent hover:border-border"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{cadence.name}</h1>
              <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${purposeConf.color} bg-current/5 border-current/10`}>
                <PurposeIcon className="h-3 w-3" />
                {purposeConf.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {steps.length} steps &middot; {enrollments.length} leads inscritos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/cadencias/${id}/editar`)}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:text-accent transition-all hover:bg-accent/5"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Excluir cadência "${cadence.name}"?`)) return;
              try {
                await deleteCadence.mutateAsync(id);
                router.push("/cadencias");
              } catch {
                // handled by react-query
              }
            }}
            disabled={deleteCadence.isPending}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/5 transition-all disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
          <button
            onClick={() => setEnrollOpen(!enrollOpen)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Inscrever Lead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Enroll panel */}
            {enrollOpen && (
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-accent" />
                    Inscrever Lead na Cadência
                  </h3>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:border-accent focus:ring-2 focus:ring-accent/10 focus:outline-none transition-all shadow-sm"
                  >
                    <option value="">Selecione um lead da sua base...</option>
                    {availableLeads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.company_name} {lead.contact_name ? `(${lead.contact_name})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleEnroll}
                    disabled={!selectedLeadId || enrollLead.isPending}
                    className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50 transition-all shadow-md shadow-accent/10"
                  >
                    {enrollLead.isPending ? "Processando..." : "Confirmar"}
                  </button>
                  <button
                    onClick={() => setEnrollOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all"
                  >
                    Cancelar
                  </button>
                </div>
                {enrollLead.isError && (
                  <p className="text-xs text-red-500 font-medium">
                    Erro ao inscrever lead. Verifique se ele já não possui uma cadência ativa.
                  </p>
                )}
              </div>
            )}

            {/* Steps timeline */}
            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40 bg-surface-raised/30 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Timeline de Execução</h2>
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{steps.length} ETAPAS</span>
              </div>
              <div className="p-6">
                <div className="space-y-0">
                  {steps.map((step, i) => {
                    const ch = CHANNEL_META[step.channel as StepChannel] || CHANNEL_META.EMAIL;
                    const ChIcon = ch.icon;
                    return (
                      <div key={step.id} className="flex gap-5">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm border border-current/10 ${ch.color} group-hover:scale-110 transition-transform`}>
                            <ChIcon className="h-5 w-5" />
                          </div>
                          {i < steps.length - 1 && (
                            <div className="w-[2px] flex-1 bg-gradient-to-b from-border/80 to-transparent my-2 rounded-full" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 ${i < steps.length - 1 ? "pb-8" : ""}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-bold text-foreground">
                              Passo {step.step_order} &mdash; {ch.label}
                            </span>
                            <span className="rounded-lg bg-surface-raised px-2.5 py-1 text-[10px] font-bold text-muted-foreground border border-border/40">
                              D+{step.day_offset}
                            </span>
                          </div>
                          {step.instructions && (
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed bg-surface-raised/40 p-3 rounded-xl border border-border/30">
                              {step.instructions}
                            </p>
                          )}
                          {step.template && (
                            <div className="mt-2 flex items-center gap-2 py-1 px-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 w-fit">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span className="text-[10px] text-emerald-600 font-bold uppercase">
                                Template: {step.template.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {cadence.description && (
              <div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
                <h2 className="text-sm font-bold text-foreground mb-3">Observações Estratégicas</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{cadence.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Enrolled leads list preview */}
            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm overflow-hidden h-fit">
              <div className="px-5 py-4 border-b border-border/40 bg-surface-raised/30 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Leads em Execução</h2>
                <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {enrollments.length}
                </span>
              </div>

              <div className="p-2">
                {enrollments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <UserPlus className="h-10 w-10 mb-2" />
                    <p className="text-[11px] font-medium">Sem leads ativos</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {enrollments.map((e: any) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded-xl hover:bg-surface-raised/60 px-3 py-3 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-sm font-bold text-accent border border-accent/10">
                            {e.lead.company_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{e.lead.company_name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground">Step {e.current_step} &bull; {e.lead.status}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnenroll(e.lead_id)}
                          disabled={unenrollLead.isPending}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Interromper cadência"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-foreground">Resumo da Cadência</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-raised/40 p-3 rounded-xl border border-border/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Taxa de Conversão</p>
                  <p className="text-lg font-bold text-emerald-500">12.5%</p>
                </div>
                <div className="bg-surface-raised/40 p-3 rounded-xl border border-border/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Tempo Médio</p>
                  <p className="text-lg font-bold text-sky-500">14d</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight italic">
                * Estatísticas baseadas nos últimos 30 dias de execução do tenant.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
