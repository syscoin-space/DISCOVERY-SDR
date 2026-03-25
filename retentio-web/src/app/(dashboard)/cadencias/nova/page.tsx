"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateCadence, type CreateCadencePayload } from "@/hooks/use-cadences";
import { useTemplates } from "@/hooks/use-templates";
import { ArrowLeft, Plus, Trash2, Mail, MessageCircle, Phone, Linkedin, GripVertical, Search, Rocket, RotateCcw, BellRing, FileText, ExternalLink } from "lucide-react";
import type { StepChannel, CadencePurpose } from "@/lib/types";
import Link from "next/link";

const PURPOSES: { value: CadencePurpose; label: string; icon: any }[] = [
  { value: "DISCOVERY", label: "Discovery", icon: Search },
  { value: "PROSPECCAO", label: "Prospecção", icon: Rocket },
  { value: "NUTRICAO", label: "Nutrição", icon: RotateCcw },
  { value: "CONFIRMACAO", label: "Confirmação", icon: BellRing },
];

const CHANNELS: { value: StepChannel; label: string; icon: typeof Mail; color: string }[] = [
  { value: "EMAIL", label: "Email", icon: Mail, color: "text-blue-500" },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle, color: "text-green-500" },
  { value: "LIGACAO", label: "Ligação", icon: Phone, color: "text-amber-500" },
  { value: "LINKEDIN", label: "LinkedIn", icon: Linkedin, color: "text-blue-700 dark:text-blue-400" },
];

interface StepDraft {
  id: string;
  day_offset: number;
  channel: StepChannel;
  template_id?: string;
  instructions: string;
}

let nextId = 1;
function makeStep(dayOffset: number): StepDraft {
  return { id: `draft-${nextId++}`, day_offset: dayOffset, channel: "EMAIL", instructions: "", template_id: "" };
}

export default function NovaCadenciaPage() {
  const router = useRouter();
  const createCadence = useCreateCadence();
  const { data: templates } = useTemplates();

  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<CadencePurpose>("PROSPECCAO");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([makeStep(0), makeStep(2), makeStep(5)]);

  function addStep() {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day_offset : 0;
    setSteps([...steps, makeStep(lastDay + 2)]);
  }

  function removeStep(id: string) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((s) => s.id !== id));
  }

  function updateStep(id: string, field: keyof StepDraft, value: string | number) {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || steps.length === 0) return;

    const payload: CreateCadencePayload = {
      name: name.trim(),
      purpose,
      description: description.trim() || undefined,
      steps: steps.map((s, i) => ({
        step_order: i + 1,
        day_offset: s.day_offset,
        channel: s.channel,
        template_id: s.template_id || undefined,
        instructions: s.instructions.trim() || undefined,
      })),
    };

    try {
      const created = await createCadence.mutateAsync(payload);
      router.push(`/cadencias/${created.id}`);
    } catch {
      // error handled by react-query
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-6 py-4">
        <button
          onClick={() => router.push("/cadencias")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nova Cadência</h1>
          <p className="text-sm text-muted-foreground">Configure os steps de prospecção</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Basic info */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Informações Básicas</h2>

            <div>
              <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                Nome da Cadência
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prospecção E-commerce Standard"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Propósito
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as CadencePurpose)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Steps da Cadência</h2>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Plus className="h-3 w-3" />
                Adicionar Step
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => {
                const channelConf = CHANNELS.find((c) => c.value === step.channel);
                return (
                  <div
                    key={step.id}
                    className="flex gap-3 rounded-lg border border-border/50 bg-surface-raised p-3"
                  >
                    {/* Order indicator */}
                    <div className="flex flex-col items-center pt-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 mb-1" />
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                        {index + 1}
                      </span>
                    </div>

                    {/* Fields */}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-3">
                        <div className="w-24">
                          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                            Dia
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={step.day_offset}
                            onChange={(e) => updateStep(step.id, "day_offset", parseInt(e.target.value) || 0)}
                            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                            Canal
                          </label>
                          <div className="flex gap-1">
                            {CHANNELS.map((ch) => {
                              const ChIcon = ch.icon;
                              const isActive = step.channel === ch.value;
                              return (
                                <button
                                  key={ch.value}
                                  type="button"
                                  onClick={() => updateStep(step.id, "channel", ch.value)}
                                  className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors ${
                                    isActive
                                      ? "border-accent bg-accent text-white shadow-sm"
                                      : "border-border bg-surface-raised text-muted-foreground hover:border-accent/20"
                                  }`}
                                  title={ch.label}
                                >
                                  <ChIcon className="h-3 w-3" />
                                  {ch.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                          Instruções (opcional)
                        </label>
                          <textarea
                            value={step.instructions}
                            onChange={(e) => updateStep(step.id, "instructions", e.target.value)}
                            placeholder={`O que fazer no dia ${step.day_offset} via ${channelConf?.label ?? step.channel}...`}
                            rows={2}
                            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none resize-none"
                          />
                        </div>

                        <div>
                          <label className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                            <span>Template Vinculado (opcional)</span>
                            <Link href="/templates/novo" target="_blank" className="flex items-center gap-0.5 text-accent hover:underline">
                              Criar novo <ExternalLink className="h-2 w-2" />
                            </Link>
                          </label>
                          <div className="relative">
                            <select
                              value={step.template_id}
                              onChange={(e) => updateStep(step.id, "template_id", e.target.value)}
                              className="w-full appearance-none rounded-md border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none transition-all"
                            >
                              <option value="">Sem template (apenas instruções)</option>
                              {templates
                                ?.filter((t) => t.channel === step.channel)
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                            </select>
                            <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          </div>
                          {templates?.filter((t) => t.channel === step.channel).length === 0 && (
                            <p className="mt-1 text-[9px] text-amber-500 italic">
                              Nenhum template de {channelConf?.label} encontrado.
                            </p>
                          )}
                        </div>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      disabled={steps.length <= 1}
                      className="self-start p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.push("/cadencias")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || steps.length === 0 || createCadence.isPending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {createCadence.isPending ? "Criando..." : "Criar Cadência"}
            </button>
          </div>

          {createCadence.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
              Erro ao criar cadência. Verifique os dados e tente novamente.
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
