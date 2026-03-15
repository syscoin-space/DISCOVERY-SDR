"use client";

import { useState } from "react";
import { useMetas, useCreateMeta, useUpdateMeta, useDeleteMeta } from "@/hooks/use-gestor";
import { useGestorSdrs } from "@/hooks/use-gestor";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { Meta } from "@/lib/types";

const TIPO_OPTIONS = [
  { value: "reunioes_semana", label: "Reuniões / Semana" },
  { value: "handoffs_mes", label: "Handoffs / Mês" },
  { value: "atividades_dia", label: "Atividades / Dia" },
];

const PERIODO_OPTIONS = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

function tipoLabel(tipo: string) {
  return TIPO_OPTIONS.find((o) => o.value === tipo)?.label ?? tipo;
}

function periodoLabel(periodo: string) {
  return PERIODO_OPTIONS.find((o) => o.value === periodo)?.label ?? periodo;
}

export default function GestorMetasPage() {
  const { data: metas, isLoading } = useMetas();
  const { data: sdrs } = useGestorSdrs();
  const createMeta = useCreateMeta();
  const updateMeta = useUpdateMeta();
  const deleteMeta = useDeleteMeta();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Form state
  const [formTipo, setFormTipo] = useState("reunioes_semana");
  const [formValor, setFormValor] = useState("");
  const [formPeriodo, setFormPeriodo] = useState("semana");
  const [formSdrId, setFormSdrId] = useState<string>("");

  function resetForm() {
    setFormTipo("reunioes_semana");
    setFormValor("");
    setFormPeriodo("semana");
    setFormSdrId("");
    setShowForm(false);
  }

  async function handleCreate() {
    const valor = parseInt(formValor);
    if (!valor || valor <= 0) return;
    try {
      await createMeta.mutateAsync({
        tipo: formTipo,
        valor,
        periodo: formPeriodo,
        sdr_id: formSdrId || null,
      });
      resetForm();
    } catch {}
  }

  async function handleUpdate(id: string) {
    const valor = parseInt(editValue);
    if (!valor || valor <= 0) return;
    try {
      await updateMeta.mutateAsync({ id, valor });
      setEditingId(null);
    } catch {}
  }

  async function handleToggle(meta: Meta) {
    try {
      await updateMeta.mutateAsync({ id: meta.id, ativo: !meta.ativo });
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta meta?")) return;
    try {
      await deleteMeta.mutateAsync(id);
    } catch {}
  }

  if (isLoading) {
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
          <h1 className="text-xl font-bold text-foreground">Metas</h1>
          <p className="text-sm text-muted-foreground">Configure metas para a equipe ou SDRs individuais</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Meta
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Create Form */}
          {showForm && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Nova Meta</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    {TIPO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Período</label>
                  <select
                    value={formPeriodo}
                    onChange={(e) => setFormPeriodo(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    {PERIODO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Valor</label>
                  <input
                    type="number"
                    min={1}
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder="Ex: 5"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">SDR (vazio = time todo)</label>
                  <select
                    value={formSdrId}
                    onChange={(e) => setFormSdrId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">Time inteiro</option>
                    {(sdrs ?? []).map((sdr) => (
                      <option key={sdr.id} value={sdr.id}>{sdr.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!formValor || createMeta.isPending}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {createMeta.isPending ? "..." : "Criar Meta"}
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Metas Table */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">SDR</th>
                  <th className="px-4 py-3 font-medium text-center">Valor</th>
                  <th className="px-4 py-3 font-medium text-center">Período</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(metas ?? []).map((meta) => (
                  <tr key={meta.id} className={`border-b border-border/50 last:border-0 ${!meta.ativo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{tipoLabel(meta.tipo)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {meta.sdr?.name ?? <span className="text-xs italic">Time inteiro</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === meta.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={1}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-16 rounded border border-border bg-surface px-2 py-1 text-center text-sm text-foreground focus:border-accent focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate(meta.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button onClick={() => handleUpdate(meta.id)} className="text-emerald-500 hover:text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-bold text-foreground">{meta.valor}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{periodoLabel(meta.periodo)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(meta)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          meta.ativo
                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            : "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
                        }`}
                      >
                        {meta.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingId(meta.id);
                            setEditValue(String(meta.valor));
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                          title="Editar valor"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(meta.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(metas ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma meta configurada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
