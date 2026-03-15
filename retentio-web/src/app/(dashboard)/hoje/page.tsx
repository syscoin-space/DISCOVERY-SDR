"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  useTodayTasks,
  useTodaySummary,
  useUpdateTask,
  useRemoveFromToday,
} from "@/hooks/use-today";
import { X, Phone, MessageCircle, Mail, Plus } from "lucide-react";
import { PRRBadge } from "@/components/shared/PRRBadge";
import { InsightToast } from "@/components/shared/InsightToast";
import { getInsightForStatus } from "@/lib/insights";
import type { Insight } from "@/lib/insights";
import type { DailyTask } from "@/lib/types";

// ─── Status config ────────────────────────────────────────────────

interface StatusConf {
  label: string;
  color: string;
  bg: string;
  final?: boolean;
}

const DEFAULT_STATUSES: Record<string, StatusConf> = {
  PENDENTE: { label: "Pendente", color: "text-amber-600 dark:text-amber-400", bg: "" },
  ATENDEU: { label: "Atendeu", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5" },
  NAO_ATENDEU: { label: "Não atendeu", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/5" },
  MENSAGEM_ENVIADA: { label: "Msg enviada", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5" },
  REUNIAO_AGENDADA: { label: "Reunião agendada", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-l-2 border-l-emerald-500" },
  LIGAR_DEPOIS: { label: "Ligar depois", color: "text-orange-600 dark:text-orange-400", bg: "bg-amber-500/5" },
  SEM_INTERESSE: { label: "Sem interesse", color: "text-muted-foreground", bg: "", final: true },
  PESSOA_ERRADA: { label: "Pessoa errada", color: "text-purple-600 dark:text-purple-400", bg: "", final: true },
  NUMERO_ERRADO: { label: "Número errado", color: "text-gray-500 dark:text-gray-400", bg: "", final: true },
};

const DONE_STATUSES = new Set(["ATENDEU", "MENSAGEM_ENVIADA", "REUNIAO_AGENDADA"]);

const CUSTOM_STATUS_COLORS = [
  { name: "verde", class: "text-emerald-600 dark:text-emerald-400" },
  { name: "vermelho", class: "text-red-600 dark:text-red-400" },
  { name: "amarelo", class: "text-amber-600 dark:text-amber-400" },
  { name: "azul", class: "text-blue-600 dark:text-blue-400" },
  { name: "laranja", class: "text-orange-600 dark:text-orange-400" },
  { name: "roxo", class: "text-purple-600 dark:text-purple-400" },
];

const LS_KEY = "retentio:custom-statuses";

interface CustomStatus {
  key: string;
  label: string;
  colorClass: string;
}

function loadCustomStatuses(): CustomStatus[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustomStatuses(items: CustomStatus[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

// ─── Urgency helpers ──────────────────────────────────────────────

function diffMinutes(dt: string | null): number | null {
  if (!dt) return null;
  return Math.round((new Date(dt).getTime() - Date.now()) / 60000);
}

/** Priority bucket for sorting (lower = higher priority) */
function taskSortPriority(task: DailyTask, allStatuses: Record<string, StatusConf>): number {
  const conf = allStatuses[task.status];

  // 7. Final statuses → bottom
  if (conf?.final) return 70;

  // 6. Done statuses → middle-low
  if (DONE_STATUSES.has(task.status)) return 60;

  const diff = diffMinutes(task.proximo_contato);

  // Tasks with proximo_contato
  if (diff !== null) {
    // 1. ATRASADO: proximo_contato < now
    if (diff < 0) return 10;
    // 2. URGENTE: 0–30min
    if (diff <= 30) return 20;
    // 3. EM BREVE: 30min–2h
    if (diff <= 120) return 30;
    // 5. LIGAR_DEPOIS with future > 2h
    if (task.status === "LIGAR_DEPOIS") return 50;
  }

  // 4. PENDENTE without time / LIGAR_DEPOIS without time
  if (task.status === "PENDENTE" || task.status === "LIGAR_DEPOIS") return 40;

  // Default: middle
  return 55;
}

/** Secondary sort: tier A > B > C, then prr_score desc, then proximo_contato asc */
const TIER_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

function taskSortSecondary(a: DailyTask, b: DailyTask): number {
  // For tasks with proximo_contato, sort by time ascending
  const aTime = a.proximo_contato ? new Date(a.proximo_contato).getTime() : Infinity;
  const bTime = b.proximo_contato ? new Date(b.proximo_contato).getTime() : Infinity;
  if (aTime !== bTime && aTime !== Infinity && bTime !== Infinity) return aTime - bTime;

  // Then by tier
  const aTier = TIER_ORDER[a.lead.prr_tier ?? "C"] ?? 2;
  const bTier = TIER_ORDER[b.lead.prr_tier ?? "C"] ?? 2;
  if (aTier !== bTier) return aTier - bTier;

  // Then by prr_score desc
  return (b.lead.prr_score ?? 0) - (a.lead.prr_score ?? 0);
}

// ─── Contact style (animation + color) ───────────────────────────

interface ContactStyle {
  text: string;
  colorClass: string;
  animate: string;
  rowBg: string;
}

function getContactStyle(dt: string | null): ContactStyle | null {
  if (!dt) return null;
  const date = new Date(dt);
  const now = new Date();
  const diff = Math.round((date.getTime() - now.getTime()) / 60000);

  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const label = isToday
    ? `Hoje ${timeStr}`
    : isTomorrow
      ? `Amanhã ${timeStr}`
      : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ` ${timeStr}`;

  // Atrasado (< -10min or between -10 and +10)
  if (diff < -10) {
    return {
      text: `Atrasado — ${timeStr}`,
      colorClass: "text-red-500 font-bold",
      animate: "animate-pulse",
      rowBg: "bg-red-500/5 border-l-2 border-l-red-500",
    };
  }
  if (diff >= -10 && diff <= 10) {
    return {
      text: `Atrasado — ${timeStr}`,
      colorClass: "text-red-500 font-bold",
      animate: "animate-pulse",
      rowBg: "bg-orange-500/5 border-l-2 border-l-orange-500",
    };
  }
  if (diff > 10 && diff <= 30) {
    return {
      text: label,
      colorClass: "text-orange-500 font-semibold",
      animate: "animate-pulse-slow",
      rowBg: "bg-orange-500/5 border-l-2 border-l-orange-500",
    };
  }
  if (diff > 30 && diff <= 120) {
    return {
      text: label,
      colorClass: "text-orange-400",
      animate: "",
      rowBg: "",
    };
  }
  // > 2h
  return {
    text: label,
    colorClass: "text-foreground",
    animate: "",
    rowBg: "",
  };
}

// ─── Canal icons ──────────────────────────────────────────────────

const CANAL_ICON: Record<string, { icon: typeof Phone; color: string }> = {
  LIGACAO: { icon: Phone, color: "text-amber-500" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-500" },
  EMAIL: { icon: Mail, color: "text-blue-500" },
};

function formatDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── Page ─────────────────────────────────────────────────────────

export default function HojePage() {
  const { data: tasks, isLoading } = useTodayTasks();
  const { data: summary } = useTodaySummary();
  const updateTask = useUpdateTask();
  const removeTask = useRemoveFromToday();
  const [filter, setFilter] = useState<string>("ALL");
  const [editingResultado, setEditingResultado] = useState<string | null>(null);
  const [resultadoText, setResultadoText] = useState("");

  // Ligar depois — popover state
  const [ligarDepoisTaskId, setLigarDepoisTaskId] = useState<string | null>(null);
  const [ligarDepoisValue, setLigarDepoisValue] = useState("");
  const ligarDepoisRef = useRef<HTMLDivElement>(null);

  // Insights
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);

  // Custom statuses
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(CUSTOM_STATUS_COLORS[0].class);
  const addStatusRef = useRef<HTMLDivElement>(null);

  // Force re-render every 60s so urgency styles update live
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCustomStatuses(loadCustomStatuses());
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ligarDepoisRef.current && !ligarDepoisRef.current.contains(e.target as Node)) {
        setLigarDepoisTaskId(null);
      }
      if (addStatusRef.current && !addStatusRef.current.contains(e.target as Node)) {
        setShowAddStatus(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Merge default + custom statuses
  const allStatuses = useMemo(() => {
    const merged: Record<string, StatusConf> = { ...DEFAULT_STATUSES };
    for (const cs of customStatuses) {
      merged[cs.key] = { label: cs.label, color: cs.colorClass, bg: "" };
    }
    return merged;
  }, [customStatuses]);

  const statusKeys = useMemo(() => Object.keys(allStatuses), [allStatuses]);

  // Filter & sort tasks by priority
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    const filtered = tasks.filter((t) => filter === "ALL" || t.status === filter);

    return [...filtered].sort((a, b) => {
      const aPri = taskSortPriority(a, allStatuses);
      const bPri = taskSortPriority(b, allStatuses);
      if (aPri !== bPri) return aPri - bPri;
      return taskSortSecondary(a, b);
    });
  }, [tasks, filter, allStatuses]);

  function handleStatusChange(taskId: string, status: string) {
    updateTask.mutate({ id: taskId, status });

    if (status === "LIGAR_DEPOIS") {
      const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
      const isoLocal = defaultTime.toISOString().slice(0, 16);
      setLigarDepoisValue(isoLocal);
      setLigarDepoisTaskId(taskId);
    }

    // Show contextual insight
    const task = tasks?.find((t) => t.id === taskId);
    const naoAtendeuCount = tasks?.filter(
      (t) => t.lead_id === task?.lead_id && t.status === "NAO_ATENDEU"
    ).length ?? 0;

    const insight = getInsightForStatus(status, {
      tentativas: naoAtendeuCount + (status === "NAO_ATENDEU" ? 1 : 0),
      ultimo_canal: task?.canal ?? undefined,
      contact_name: task?.lead.contact_name ?? undefined,
    });
    if (insight) {
      setActiveInsight(insight);
      setTimeout(() => setActiveInsight(null), 12000);
    }
  }

  function handleLigarDepoisConfirm(taskId: string) {
    if (ligarDepoisValue) {
      updateTask.mutate({
        id: taskId,
        proximo_contato: new Date(ligarDepoisValue).toISOString(),
      });
    }
    setLigarDepoisTaskId(null);
  }

  function handleResultadoSave(taskId: string) {
    updateTask.mutate({ id: taskId, resultado: resultadoText });
    setEditingResultado(null);
  }

  function handleRemove(taskId: string) {
    removeTask.mutate(taskId);
  }

  function handleAddCustomStatus() {
    if (!newStatusLabel.trim()) return;
    const key = newStatusLabel.trim().toUpperCase().replace(/\s+/g, "_");
    const updated = [
      ...customStatuses,
      { key, label: newStatusLabel.trim(), colorClass: newStatusColor },
    ];
    setCustomStatuses(updated);
    saveCustomStatuses(updated);
    setNewStatusLabel("");
    setShowAddStatus(false);
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando fila...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:px-6 lg:py-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Fila de Hoje</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            <span className="capitalize hidden sm:inline">{formatDate()} — </span>
            <strong className="text-foreground">{summary?.total ?? 0}</strong> leads
            {" · "}
            <span className="text-emerald-500"><strong>{summary?.atendeu ?? 0}</strong> feitos</span>
            {" · "}
            <span className="text-amber-500"><strong>{summary?.pendente ?? 0}</strong> pendentes</span>
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-2 lg:px-6 overflow-x-auto scrollbar-hide lg:flex-wrap">
        <button
          onClick={() => setFilter("ALL")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "ALL"
              ? "bg-accent text-white"
              : "bg-surface-raised text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {statusKeys.map((key) => {
          const s = allStatuses[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-accent text-white"
                  : `bg-surface-raised ${s.color} hover:opacity-80`
              }`}
            >
              {s.label}
            </button>
          );
        })}

        {/* + Status button */}
        <div className="relative" ref={addStatusRef}>
          <button
            onClick={() => setShowAddStatus(!showAddStatus)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="h-3 w-3" />
            Status
          </button>

          {showAddStatus && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg space-y-3">
              <p className="text-[11px] font-medium text-foreground uppercase tracking-wide">
                Novo Status
              </p>
              <input
                autoFocus
                type="text"
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                placeholder="Nome do status..."
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomStatus();
                }}
              />
              <div className="flex gap-1.5">
                {CUSTOM_STATUS_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setNewStatusColor(c.class)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      newStatusColor === c.class ? "scale-110 border-foreground" : "border-transparent"
                    }`}
                    title={c.name}
                  >
                    <span
                      className="block h-full w-full rounded-full"
                      style={{
                        backgroundColor:
                          c.name === "verde" ? "#059669" :
                          c.name === "vermelho" ? "#dc2626" :
                          c.name === "amarelo" ? "#d97706" :
                          c.name === "azul" ? "#2563eb" :
                          c.name === "laranja" ? "#ea580c" :
                          "#9333ea",
                      }}
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddCustomStatus}
                disabled={!newStatusLabel.trim()}
                className="w-full rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Insight Toast */}
      {activeInsight && (
        <div className="fixed bottom-20 right-4 left-4 z-50 lg:left-auto lg:bottom-6 lg:right-6 lg:w-96">
          <InsightToast insight={activeInsight} onClose={() => setActiveInsight(null)} />
        </div>
      )}

      {/* Ligar depois sheet (mobile-friendly) */}
      {ligarDepoisTaskId && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLigarDepoisTaskId(null)} />
          <div ref={ligarDepoisRef} className="relative w-full max-w-sm mx-4 mb-20 lg:mb-0 rounded-xl border border-border bg-surface p-4 shadow-lg space-y-3">
            <p className="text-sm font-medium text-foreground">Ligar quando?</p>
            <input
              autoFocus
              type="datetime-local"
              value={ligarDepoisValue}
              onChange={(e) => setLigarDepoisValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setLigarDepoisTaskId(null)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">Cancelar</button>
              <button onClick={() => handleLigarDepoisConfirm(ligarDepoisTaskId)} className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">
              {filter === "ALL"
                ? "Nenhum lead na fila de hoje. Adicione leads pelo Pipeline."
                : "Nenhum lead com este status."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Empresa</th>
                    <th className="px-3 py-2 text-left font-medium w-24">PRR</th>
                    <th className="px-3 py-2 text-left font-medium w-16">ICP</th>
                    <th className="px-3 py-2 text-left font-medium w-16">Canal</th>
                    <th className="px-3 py-2 text-left font-medium w-44">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Resultado</th>
                    <th className="px-3 py-2 text-left font-medium w-40">Próximo Contato</th>
                    <th className="px-3 py-2 text-center font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map((task) => {
                    const statusConf = allStatuses[task.status];
                    const isFinal = statusConf?.final === true;
                    const canalConf = task.canal ? CANAL_ICON[task.canal] : null;
                    const CanalIcon = canalConf?.icon;
                    const contactStyle = getContactStyle(task.proximo_contato);
                    const rowClasses = isFinal
                      ? "opacity-40"
                      : contactStyle?.rowBg
                        ? contactStyle.rowBg
                        : statusConf?.bg ?? "";

                    return (
                      <tr
                        key={task.id}
                        className={`border-b border-border/50 transition-colors hover:bg-surface-raised ${rowClasses}`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="text-sm font-medium text-foreground">{task.lead.company_name}</div>
                          {task.lead.niche && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{task.lead.niche}</div>}
                        </td>
                        <td className="px-3 py-2.5"><PRRBadge tier={task.lead.prr_tier} score={task.lead.prr_score} /></td>
                        <td className="px-3 py-2.5"><span className="text-xs text-muted-foreground">{task.lead.icp_score != null ? `${task.lead.icp_score}/14` : "—"}</span></td>
                        <td className="px-3 py-2.5">
                          {CanalIcon ? <CanalIcon className={`h-4 w-4 ${canalConf.color}`} /> : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`rounded-md border-0 bg-transparent text-xs font-medium focus:outline-none focus:ring-1 focus:ring-accent px-1 py-0.5 cursor-pointer ${statusConf?.color ?? "text-foreground"}`}
                          >
                            {statusKeys.map((key) => <option key={key} value={key}>{allStatuses[key].label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          {editingResultado === task.id ? (
                            <input autoFocus type="text" value={resultadoText} onChange={(e) => setResultadoText(e.target.value)} onBlur={() => handleResultadoSave(task.id)} onKeyDown={(e) => { if (e.key === "Enter") handleResultadoSave(task.id); if (e.key === "Escape") setEditingResultado(null); }} className="w-full rounded border border-border bg-surface-raised px-2 py-1 text-xs text-foreground font-medium focus:border-accent focus:outline-none" />
                          ) : (
                            <button onClick={() => { setEditingResultado(task.id); setResultadoText(task.resultado ?? ""); }} className={`w-full text-left text-xs transition-colors truncate max-w-[200px] ${task.resultado ? "text-foreground font-medium hover:text-accent" : "text-muted-foreground italic hover:text-foreground"}`}>{task.resultado || "O que aconteceu?"}</button>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {contactStyle ? (
                            <span className={`text-xs ${contactStyle.colorClass} ${contactStyle.animate}`}>{contactStyle.text}</span>
                          ) : (
                            <input type="datetime-local" value="" onChange={(e) => { const val = e.target.value; updateTask.mutate({ id: task.id, proximo_contato: val ? new Date(val).toISOString() : null }); }} className="rounded border-0 bg-transparent text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent px-1 py-0.5" />
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => handleRemove(task.id)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors" title="Remover da fila"><X className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden px-4 py-3 space-y-3">
              {sortedTasks.map((task) => {
                const statusConf = allStatuses[task.status];
                const isFinal = statusConf?.final === true;
                const contactStyle = getContactStyle(task.proximo_contato);
                const borderColor = contactStyle?.rowBg?.includes("red")
                  ? "border-l-red-500"
                  : contactStyle?.rowBg?.includes("orange")
                    ? "border-l-orange-500"
                    : statusConf?.bg?.includes("emerald")
                      ? "border-l-emerald-500"
                      : "border-l-transparent";

                return (
                  <div
                    key={task.id}
                    className={`rounded-xl border border-border bg-surface p-4 border-l-2 ${borderColor} ${isFinal ? "opacity-40" : ""}`}
                  >
                    {/* Line 1: PRR + Company + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PRRBadge tier={task.lead.prr_tier} score={task.lead.prr_score} />
                        <span className="text-sm font-semibold text-foreground truncate">
                          {task.lead.company_name}
                        </span>
                      </div>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className={`shrink-0 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-xs font-medium ${statusConf?.color ?? "text-foreground"}`}
                      >
                        {statusKeys.map((key) => <option key={key} value={key}>{allStatuses[key].label}</option>)}
                      </select>
                    </div>

                    {/* Line 2: Niche + city */}
                    {(task.lead.niche || task.lead.city) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {task.lead.niche}{task.lead.niche && task.lead.city ? " · " : ""}{task.lead.city}
                      </p>
                    )}

                    {/* Line 3: Resultado */}
                    <div className="mt-2">
                      {editingResultado === task.id ? (
                        <input autoFocus type="text" value={resultadoText} onChange={(e) => setResultadoText(e.target.value)} onBlur={() => handleResultadoSave(task.id)} onKeyDown={(e) => { if (e.key === "Enter") handleResultadoSave(task.id); if (e.key === "Escape") setEditingResultado(null); }} className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none" placeholder="O que aconteceu?" />
                      ) : (
                        <button onClick={() => { setEditingResultado(task.id); setResultadoText(task.resultado ?? ""); }} className={`text-xs ${task.resultado ? "text-foreground" : "text-muted-foreground italic"}`}>
                          {task.resultado ? `Resultado: ${task.resultado}` : "O que aconteceu? ✏️"}
                        </button>
                      )}
                    </div>

                    {/* Line 4: Contact time */}
                    {contactStyle && (
                      <p className={`mt-2 text-xs ${contactStyle.colorClass} ${contactStyle.animate}`}>
                        {contactStyle.text}
                      </p>
                    )}

                    {/* Footer: action buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      <button
                        onClick={() => handleStatusChange(task.id, "ATENDEU")}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600"
                      >
                        <Phone className="h-3.5 w-3.5" /> Ligar
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, "MENSAGEM_ENVIADA")}
                        className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-medium text-green-600"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                      <button
                        onClick={() => handleRemove(task.id)}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500"
                      >
                        <X className="h-3.5 w-3.5" /> Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
