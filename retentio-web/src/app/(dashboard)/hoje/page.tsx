"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useTodayTasks,
  useTodaySummary,
  useUpdateTask,
  useRemoveFromToday,
} from "@/hooks/use-today";
import { X, Phone, MessageCircle, Mail, Plus, CalendarPlus, Pencil, Clock } from "lucide-react";
import { Drawer } from "vaul";
import { LeadSidebar } from "@/components/kanban/LeadSidebar";
import Tooltip from "@/components/ui/Tooltip";
import { useKanbanStore } from "@/lib/stores/kanban.store";
import { useAgenda } from "@/hooks/use-agenda";
import { startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PRRBadge } from "@/components/shared/PRRBadge";
import { InsightToast } from "@/components/shared/InsightToast";
import { DateTimePicker } from "@/components/shared/DateTimePicker";
import { SendEmailModal } from "@/components/hoje/SendEmailModal";
import { useToast } from "@/components/shared/Toast";
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

function taskSortPriority(task: DailyTask, allStatuses: Record<string, StatusConf>): number {
  const conf = allStatuses[task.status];
  if (conf?.final) return 70;
  if (DONE_STATUSES.has(task.status)) return 60;
  const diff = diffMinutes(task.proximo_contato);
  if (diff !== null) {
    if (diff < 0) return 10;
    if (diff <= 30) return 20;
    if (diff <= 120) return 30;
    if (task.status === "LIGAR_DEPOIS") return 50;
  }
  if (task.status === "PENDENTE" || task.status === "LIGAR_DEPOIS") return 40;
  return 55;
}

const TIER_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

function taskSortSecondary(a: DailyTask, b: DailyTask): number {
  const aTime = a.proximo_contato ? new Date(a.proximo_contato).getTime() : Infinity;
  const bTime = b.proximo_contato ? new Date(b.proximo_contato).getTime() : Infinity;
  if (aTime !== bTime && aTime !== Infinity && bTime !== Infinity) return aTime - bTime;
  const aTier = TIER_ORDER[a.lead.prr_tier ?? "C"] ?? 2;
  const bTier = TIER_ORDER[b.lead.prr_tier ?? "C"] ?? 2;
  if (aTier !== bTier) return aTier - bTier;
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
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth() && date.getFullYear() === tomorrow.getFullYear();
  const label = isToday ? `Hoje ${timeStr}` : isTomorrow ? `Amanhã ${timeStr}` : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ` ${timeStr}`;

  if (diff < -10) return { text: `Atrasado — ${timeStr}`, colorClass: "text-red-500 font-bold", animate: "animate-pulse", rowBg: "bg-red-500/5 border-l-2 border-l-red-500" };
  if (diff >= -10 && diff <= 10) return { text: `Atrasado — ${timeStr}`, colorClass: "text-red-500 font-bold", animate: "animate-pulse", rowBg: "bg-orange-500/5 border-l-2 border-l-orange-500" };
  if (diff > 10 && diff <= 30) return { text: label, colorClass: "text-orange-500 font-semibold", animate: "animate-pulse-slow", rowBg: "bg-orange-500/5 border-l-2 border-l-orange-500" };
  if (diff > 30 && diff <= 120) return { text: label, colorClass: "text-orange-400", animate: "", rowBg: "" };
  return { text: label, colorClass: "text-foreground", animate: "", rowBg: "" };
}

// ─── Canal icons ──────────────────────────────────────────────────

const CANAL_ICON: Record<string, { icon: typeof Phone; color: string }> = {
  LIGACAO: { icon: Phone, color: "text-amber-500" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-500" },
  EMAIL: { icon: Mail, color: "text-blue-500" },
};

function formatDate(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

// ─── Format phone for WhatsApp ────────────────────────────────────

function formatWaNumber(num: string): string {
  const digits = num.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatPhoneDisplay(num: string): string {
  const digits = num.replace(/\D/g, "");
  if (digits.length >= 10) {
    const ddd = digits.slice(-10, -8);
    const part = digits.slice(-8);
    return `(${ddd}) ${part.slice(0, 4)}...`;
  }
  return num.length > 10 ? num.slice(0, 10) + "..." : num;
}

function formatEmailDisplay(email: string): string {
  if (email.length > 18) return email.slice(0, 15) + "...";
  return email;
}

// ─── Contact Pills Component ─────────────────────────────────────

function ContactPills({
  task,
  onEmailClick,
  isMobile,
}: {
  task: DailyTask;
  onEmailClick: () => void;
  isMobile: boolean;
}) {
  const { toast } = useToast();
  const { whatsapp, email, phone } = task.lead;
  const hasAny = whatsapp || email || phone;

  if (!hasAny) return <span className="text-xs text-muted-foreground">—</span>;

  function handlePhoneClick(number: string) {
    if (isMobile) {
      window.open(`tel:${number}`, "_blank");
    } else {
      navigator.clipboard.writeText(number);
      toast("Número copiado");
    }
  }

  function handleWhatsAppClick(number: string) {
    if (isMobile) {
      window.open(`https://wa.me/${formatWaNumber(number)}`, "_blank");
    } else {
      navigator.clipboard.writeText(number);
      toast("Número copiado");
    }
  }

  return (
    <div className={`flex ${isMobile ? "flex-wrap" : ""} items-center gap-1.5`}>
      {whatsapp && (
        <button
          onClick={() => handleWhatsAppClick(whatsapp)}
          className={`flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-[11px] font-medium text-green-600 dark:text-green-400 transition-colors hover:bg-green-500/20 ${isMobile ? "min-h-[36px]" : ""}`}
        >
          <MessageCircle className="h-3 w-3" />
          <span className="truncate max-w-[80px]">{formatPhoneDisplay(whatsapp)}</span>
        </button>
      )}
      {email && (
        <button
          onClick={onEmailClick}
          className={`flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/20 ${isMobile ? "min-h-[36px]" : ""}`}
        >
          <Mail className="h-3 w-3" />
          <span className="truncate max-w-[80px]">{formatEmailDisplay(email)}</span>
        </button>
      )}
      {phone && (
        <button
          onClick={() => handlePhoneClick(phone)}
          className={`flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-raised/80 ${isMobile ? "min-h-[36px]" : ""}`}
        >
          <Phone className="h-3 w-3" />
          <span className="truncate max-w-[80px]">{formatPhoneDisplay(phone)}</span>
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function HojePage() {
  const { data: tasks, isLoading } = useTodayTasks();
  const { data: summary } = useTodaySummary();
  const updateTask = useUpdateTask();
  const removeTask = useRemoveFromToday();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("ALL");
  const [editingResultado, setEditingResultado] = useState<string | null>(null);

  const dayStart = startOfDay(new Date());
  const dayEnd = endOfDay(new Date());
  const { data: agendaData } = useAgenda(dayStart.toISOString(), dayEnd.toISOString());

  // Derive non-contact agenda events
  const agendaEvents = useMemo(() => {
    if (!agendaData) return [];
    const evts = [];
    for (const r of agendaData.reunioes) {
      evts.push({ id: `r-${r.id}`, type: "reuniao", title: r.lead?.company_name ?? r.titulo, time: new Date(r.inicio) });
    }
    for (const s of agendaData.steps) {
      evts.push({ id: `s-${s.id}`, type: "step", title: s.lead_cadence?.lead?.company_name ?? "Step", subtitle: `Step ${s.cadence_step?.step_order}`, time: new Date(s.scheduled_at) });
    }
    for (const g of agendaData.google_events) {
      evts.push({ id: `g-${g.id}`, type: "google", title: g.summary, time: new Date(g.start) });
    }
    return evts.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [agendaData]);
  const [resultadoText, setResultadoText] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const { selectedLeadId, setSelectedLeadId } = useKanbanStore();

  // DateTimePicker state
  const [pickerTaskId, setPickerTaskId] = useState<string | null>(null);
  const pickerTask = useMemo(() => tasks?.find((t) => t.id === pickerTaskId), [tasks, pickerTaskId]);

  // Send Email Modal state
  const [emailTask, setEmailTask] = useState<DailyTask | null>(null);

  // Post-call sheet state (mobile)
  const [postCallTask, setPostCallTask] = useState<DailyTask | null>(null);

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
    setIsMobile(window.innerWidth < 1024);
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addStatusRef.current && !addStatusRef.current.contains(e.target as Node)) {
        setShowAddStatus(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Post-call detection via visibilitychange
  useEffect(() => {
    if (!postCallTask) return;
    function onVisibilityChange() {
      // When user returns from phone call, the sheet is already open
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [postCallTask]);

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
      setPickerTaskId(taskId);
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

  function handleScheduleConfirm(iso: string) {
    if (!pickerTaskId) return;
    const task = tasks?.find((t) => t.id === pickerTaskId);
    // If task was PENDENTE and user schedules, auto-change to LIGAR_DEPOIS
    if (task?.status === "PENDENTE") {
      updateTask.mutate({ id: pickerTaskId, proximo_contato: iso, status: "LIGAR_DEPOIS" });
    } else {
      updateTask.mutate({ id: pickerTaskId, proximo_contato: iso });
    }
    const d = new Date(iso);
    const formatted = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ` ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    toast(`Contato agendado para ${formatted}`);
  }

  function handleScheduleClear() {
    if (!pickerTaskId) return;
    updateTask.mutate({ id: pickerTaskId, proximo_contato: null });
    toast("Agendamento removido");
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

  // Mobile call action
  function handleMobileCall(task: DailyTask) {
    const number = task.lead.whatsapp || task.lead.phone;
    if (!number) {
      toast("Nenhum número cadastrado para esse lead", "error");
      return;
    }
    if (task.lead.whatsapp) {
      window.open(`https://wa.me/${formatWaNumber(task.lead.whatsapp)}`, "_blank");
    } else {
      window.open(`tel:${number}`, "_blank");
    }
    // Open post-call sheet when user returns
    setPostCallTask(task);
  }

  // Post-call result handlers
  function handlePostCallResult(status: string) {
    if (!postCallTask) return;
    handleStatusChange(postCallTask.id, status);
    if (status === "LIGAR_DEPOIS") {
      setPickerTaskId(postCallTask.id);
    }
    setPostCallTask(null);
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
        {/* Content */}
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
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomStatus(); }}
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

      {/* DateTimePicker */}
      <DateTimePicker
        open={!!pickerTaskId}
        onOpenChange={(open) => { if (!open) setPickerTaskId(null); }}
        value={pickerTask?.proximo_contato}
        onConfirm={handleScheduleConfirm}
        onClear={handleScheduleClear}
      />

      {/* Send Email Modal */}
      {emailTask && (
        <SendEmailModal
          open={!!emailTask}
          onOpenChange={(open) => { if (!open) setEmailTask(null); }}
          leadId={emailTask.lead.id}
          leadEmail={emailTask.lead.email!}
          companyName={emailTask.lead.company_name}
          contactName={emailTask.lead.contact_name}
          niche={emailTask.lead.niche}
          onSent={() => {
            handleStatusChange(emailTask.id, "MENSAGEM_ENVIADA");
            setEmailTask(null);
          }}
        />
      )}

      {/* Post-call bottom sheet (mobile) */}
      <Drawer.Root open={!!postCallTask} onOpenChange={(open) => { if (!open) setPostCallTask(null); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-surface outline-none">
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <Drawer.Title className="px-4 pb-2 text-sm font-bold text-foreground">
              Como foi a ligação com {postCallTask?.lead.company_name}?
            </Drawer.Title>
            <div className="px-4 pb-safe space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handlePostCallResult("ATENDEU")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 active:bg-emerald-500/20 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  <span className="text-xs font-medium">Atendeu</span>
                </button>
                <button
                  onClick={() => handlePostCallResult("NAO_ATENDEU")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-500 active:bg-red-500/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                  <span className="text-xs font-medium">Não atendeu</span>
                </button>
                <button
                  onClick={() => handlePostCallResult("LIGAR_DEPOIS")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-orange-500 active:bg-orange-500/20 transition-colors"
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-xs font-medium">Ligar depois</span>
                </button>
              </div>
              <button
                onClick={() => setPostCallTask(null)}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground"
              >
                Cancelar
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
        
        {/* Agenda Events Section */}
        {agendaEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-accent" />
              Agenda de Hoje
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {agendaEvents.map((evt) => (
                <div key={evt.id} className="flex flex-col gap-1 rounded-xl border border-border bg-surface-raised p-3 border-l-4" style={{ borderLeftColor: evt.type === 'reuniao' ? '#10b981' : evt.type === 'step' ? '#3b82f6' : '#f87171' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{evt.title}</span>
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{format(evt.time, "HH:mm")}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">
                      {evt.type === "reuniao" ? "Reunião" : evt.type === "step" ? evt.subtitle : "Google"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground">Fila de Contato</h3>
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
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Empresa</th>
                    <th className="px-3 py-2 text-left font-medium w-20">PRR</th>
                    <th className="px-3 py-2 text-left font-medium w-14">ICP</th>
                    <th className="px-3 py-2 text-left font-medium w-[180px]">Contato</th>
                    <th className="px-3 py-2 text-left font-medium w-36">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Resultado</th>
                    <th className="px-3 py-2 text-left font-medium w-40">Próximo Contato</th>
                    <th className="px-3 py-2 text-center font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map((task) => {
                    const statusConf = allStatuses[task.status];
                    const isFinal = statusConf?.final === true;
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
                        {/* Empresa */}
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => setSelectedLeadId(task.lead.id)}
                            className="text-left w-full"
                          >
                            <Tooltip content="Abrir cartão do lead">
                              <div className="text-sm font-medium text-foreground hover:text-accent hover:underline">{task.lead.company_name}</div>
                            </Tooltip>
                            {task.lead.niche && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{task.lead.niche}</div>}
                          </button>
                        </td>
                        {/* PRR */}
                        <td className="px-3 py-2.5"><PRRBadge tier={task.lead.prr_tier} score={task.lead.prr_score} /></td>
                        {/* ICP */}
                        <td className="px-3 py-2.5"><span className="text-xs text-muted-foreground">{task.lead.icp_score != null ? `${task.lead.icp_score}/14` : "—"}</span></td>
                        {/* Contato (new) */}
                        <td className="px-3 py-2.5">
                          <ContactPills
                            task={task}
                            onEmailClick={() => task.lead.email && setEmailTask(task)}
                            isMobile={false}
                          />
                        </td>
                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`rounded-md border-0 bg-transparent text-xs font-medium focus:outline-none focus:ring-1 focus:ring-accent px-1 py-0.5 cursor-pointer ${statusConf?.color ?? "text-foreground"}`}
                          >
                            {statusKeys.map((key) => <option key={key} value={key}>{allStatuses[key].label}</option>)}
                          </select>
                        </td>
                        {/* Resultado */}
                        <td className="px-3 py-2.5">
                          {editingResultado === task.id ? (
                            <input autoFocus type="text" value={resultadoText} onChange={(e) => setResultadoText(e.target.value)} onBlur={() => handleResultadoSave(task.id)} onKeyDown={(e) => { if (e.key === "Enter") handleResultadoSave(task.id); if (e.key === "Escape") setEditingResultado(null); }} className="w-full rounded border border-border bg-surface-raised px-2 py-1 text-xs text-foreground font-medium focus:border-accent focus:outline-none" />
                          ) : (
                            <button onClick={() => { setEditingResultado(task.id); setResultadoText(task.resultado ?? ""); }} className={`w-full text-left text-xs transition-colors truncate max-w-[200px] ${task.resultado ? "text-foreground font-medium hover:text-accent" : "text-muted-foreground italic hover:text-foreground"}`}>{task.resultado || "O que aconteceu?"}</button>
                          )}
                        </td>
                        {/* Próximo Contato */}
                        <td className="px-3 py-2.5">
                          {contactStyle ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs ${contactStyle.colorClass} ${contactStyle.animate}`}>{contactStyle.text}</span>
                              <button
                                onClick={() => setPickerTaskId(task.id)}
                                className="p-0.5 text-muted-foreground hover:text-accent transition-colors"
                                title="Editar agendamento"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  updateTask.mutate({ id: task.id, proximo_contato: null });
                                  toast("Agendamento removido");
                                }}
                                className="p-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Remover agendamento"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPickerTaskId(task.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                              + Agendar
                            </button>
                          )}
                        </td>
                        {/* Remove */}
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

                    {/* Line 3: Contact pills */}
                    <div className="mt-2">
                      <ContactPills
                        task={task}
                        onEmailClick={() => task.lead.email && setEmailTask(task)}
                        isMobile={true}
                      />
                    </div>

                    {/* Line 4: Resultado */}
                    <div className="mt-2">
                      {editingResultado === task.id ? (
                        <input autoFocus type="text" value={resultadoText} onChange={(e) => setResultadoText(e.target.value)} onBlur={() => handleResultadoSave(task.id)} onKeyDown={(e) => { if (e.key === "Enter") handleResultadoSave(task.id); if (e.key === "Escape") setEditingResultado(null); }} className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none" placeholder="O que aconteceu?" />
                      ) : (
                        <button onClick={() => { setEditingResultado(task.id); setResultadoText(task.resultado ?? ""); }} className={`text-xs ${task.resultado ? "text-foreground" : "text-muted-foreground italic"}`}>
                          {task.resultado ? `Resultado: ${task.resultado}` : "O que aconteceu? \u270F\uFE0F"}
                        </button>
                      )}
                    </div>

                    {/* Line 5: Contact time + Schedule */}
                    <div className="mt-2 flex items-center justify-between">
                      {contactStyle ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs ${contactStyle.colorClass} ${contactStyle.animate}`}>
                            {contactStyle.text}
                          </span>
                          <button onClick={() => setPickerTaskId(task.id)} className="p-0.5 text-muted-foreground">
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPickerTaskId(task.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          + Agendar
                        </button>
                      )}
                    </div>

                    {/* Footer: action buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      <button
                        onClick={() => handleMobileCall(task)}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 min-h-[40px]"
                      >
                        <Phone className="h-3.5 w-3.5" /> Ligar
                      </button>
                      {task.lead.whatsapp && (
                        <button
                          onClick={() => window.open(`https://wa.me/${formatWaNumber(task.lead.whatsapp!)}`, "_blank")}
                          className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-medium text-green-600 min-h-[40px]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(task.id)}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 min-h-[40px]"
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
      {/* Lead Sidebar */}
      <LeadSidebar leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
