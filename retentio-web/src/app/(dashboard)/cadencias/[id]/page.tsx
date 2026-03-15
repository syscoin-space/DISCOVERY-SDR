"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useCadence, useEnrollLead, useUnenrollLead, useDeleteCadence } from "@/hooks/use-cadences";
import { useAllLeads } from "@/hooks/use-leads";
import { useState } from "react";
import {
  ArrowLeft, Mail, MessageCircle, Phone, Linkedin,
  UserPlus, UserMinus, CheckCircle2, Clock, XCircle, SkipForward, AlertTriangle,
  Pencil, Trash2,
} from "lucide-react";
import type { StepChannel, StepStatus } from "@/lib/types";

const CHANNEL_META: Record<StepChannel, { icon: typeof Mail; color: string; label: string }> = {
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
  const enrolledLeads = cadence.lead_cadences ?? [];

  // Leads available to enroll (not already enrolled)
  const enrolledIds = new Set(enrolledLeads.map((lc) => lc.lead.id));
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
    try {
      await unenrollLead.mutateAsync({ cadenceId: id, leadId });
    } catch {
      // handled by react-query
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/cadencias")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{cadence.name}</h1>
            <p className="text-sm text-muted-foreground">
              {cadence.type} &middot; {steps.length} steps &middot; {enrolledLeads.length} leads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/cadencias/${id}/editar`)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
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
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:border-red-500 hover:text-red-500 hover:bg-red-500/5 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
          <button
            onClick={() => setEnrollOpen(!enrollOpen)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Inscrever Lead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Enroll panel */}
          {enrollOpen && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Inscrever Lead na Cadência</h3>
              <div className="flex gap-2">
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">Selecione um lead...</option>
                  {availableLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company_name} {lead.contact_name ? `(${lead.contact_name})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleEnroll}
                  disabled={!selectedLeadId || enrollLead.isPending}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {enrollLead.isPending ? "..." : "Inscrever"}
                </button>
                <button
                  onClick={() => setEnrollOpen(false)}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
              {enrollLead.isError && (
                <p className="text-xs text-red-500">
                  {(enrollLead.error as Error)?.message?.includes("ALREADY_ENROLLED")
                    ? "Lead já inscrito nesta cadência"
                    : "Erro ao inscrever lead"}
                </p>
              )}
            </div>
          )}

          {/* Steps timeline */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Timeline de Steps</h2>
            <div className="space-y-0">
              {steps.map((step, i) => {
                const ch = CHANNEL_META[step.channel];
                const ChIcon = ch.icon;
                return (
                  <div key={step.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${ch.color}`}>
                        <ChIcon className="h-4 w-4" />
                      </div>
                      {i < steps.length - 1 && (
                        <div className="w-px flex-1 bg-border my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 ${i < steps.length - 1 ? "pb-4" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          Step {step.step_order} &mdash; {ch.label}
                        </span>
                        <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground">
                          Dia {step.day_offset}
                        </span>
                      </div>
                      {step.instructions && (
                        <p className="mt-1 text-xs text-muted-foreground">{step.instructions}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enrolled leads */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Leads Inscritos ({enrolledLeads.length})
            </h2>

            {enrolledLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhum lead inscrito nesta cadência
              </p>
            ) : (
              <div className="space-y-2">
                {enrolledLeads.map((lc) => (
                  <div
                    key={lc.lead.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-surface-raised px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {lc.lead.company_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{lc.lead.company_name}</p>
                        <p className="text-[10px] text-muted-foreground">{lc.lead.status.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnenroll(lc.lead.id)}
                      disabled={unenrollLead.isPending}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Remover lead da cadência"
                    >
                      <UserMinus className="h-3 w-3" />
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cadence.description && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Descrição</h2>
              <p className="text-sm text-muted-foreground">{cadence.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
