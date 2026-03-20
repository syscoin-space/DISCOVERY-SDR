"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useTodayTasks,
  useTodaySummary,
  useUpdateTask,
  useRemoveFromToday,
} from "@/hooks/use-today";
import { X, Phone, MessageCircle, Mail, Plus, CalendarPlus, Pencil, Clock, ListTodo } from "lucide-react";
import { Drawer } from "vaul";
import { LeadSidebar } from "@/components/kanban/LeadSidebar";
import Tooltip from "@/components/ui/Tooltip";
import { useKanbanStore } from "@/lib/stores/kanban.store";
import { PRRBadge } from "@/components/shared/PRRBadge";
import { InsightToast } from "@/components/shared/InsightToast";
import { DateTimePicker } from "@/components/shared/DateTimePicker";
import { SendEmailModal } from "@/components/hoje/SendEmailModal";
import { useToast } from "@/components/shared/Toast";
import { getInsightForStatus } from "@/lib/insights";
import type { Insight } from "@/lib/insights";
import type { Task } from "@/lib/types";

// ─── Status config ────────────────────────────────────────────────

interface StatusConf {
  label: string;
  color: string;
  bg: string;
  final?: boolean;
}

const DEFAULT_STATUSES: Record<string, StatusConf> = {
  PENDENTE: { label: "Pendente", color: "text-amber-600 dark:text-amber-400", bg: "" },
  EM_ANDAMENTO: { label: "Em andamento", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5" },
  CONCLUIDA: { label: "Concluída", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5", final: true },
  ATRASADA: { label: "Atrasada", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/5" },
};

const DONE_STATUSES = new Set(["CONCLUIDA"]);

const V2_OUTCOMES = [
  { key: "ATENDEU", label: "Atendeu", color: "text-emerald-600" },
  { key: "NAO_ATENDEU", label: "Não atendeu", color: "text-red-600" },
  { key: "REUNIAO_MARCADA", label: "Reunião Marcada", color: "text-amber-600" },
  { key: "MENSAGEM_ENVIADA", label: "Msg Enviada", color: "text-blue-600" },
];

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

function taskSortPriority(task: Task, allStatuses: Record<string, StatusConf>): number {
  if (task.status === "CONCLUIDA") return 70;
  if (task.status === "ATRASADA") return 10;
  
  const diff = diffMinutes(task.scheduled_at);
  if (diff !== null) {
    if (diff < 0) return 20;
    if (diff <= 30) return 30;
    if (diff <= 120) return 40;
  }
  
  if (task.status === "PENDENTE") return 50;
  return 60;
}

const TIER_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

function taskSortSecondary(a: Task, b: Task): number {
  const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
  const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
  if (aTime !== bTime && aTime !== Infinity && bTime !== Infinity) return aTime - bTime;
  
  const aIcp = a.lead?.icp_score ?? 0;
  const bIcp = b.lead?.icp_score ?? 0;
  return bIcp - aIcp;
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
  task: Task;
  onEmailClick: () => void;
  isMobile: boolean;
}) {
  const { toast } = useToast();
  const whatsapp = task.lead?.whatsapp;
  const email = task.lead?.email;
  const phone = task.lead?.phone;
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

  const [resultadoText, setResultadoText] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const { selectedLeadId, setSelectedLeadId } = useKanbanStore();

  // DateTimePicker state
  const [pickerTaskId, setPickerTaskId] = useState<string | null>(null);
  const pickerTask = useMemo(() => tasks?.find((t) => t.id === pickerTaskId), [tasks, pickerTaskId]);

  // Send Email Modal state
  const [emailTask, setEmailTask] = useState<Task | null>(null);

  // Post-call sheet state (mobile)
  const [postCallTask, setPostCallTask] = useState<Task | null>(null);

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
    // If status is one of the V2_OUTCOMES, record it as outcome and mark as CONCLUIDA
    const outcomeMatch = V2_OUTCOMES.find(o => o.key === status);
    if (outcomeMatch) {
      updateTask.mutate({ id: taskId, status: "CONCLUIDA" as any, outcome: status });
    } else {
      updateTask.mutate({ id: taskId, status: status as any });
    }

    if (status === "LIGAR_DEPOIS") {
      setPickerTaskId(taskId);
    }

    // Show contextual insight
    const task = tasks?.find((t) => t.id === taskId);
    const naoAtendeuCount = tasks?.filter(
      (t) => t.lead_id === task?.lead_id && t.outcome === "NAO_ATENDEU"
    ).length ?? 0;

    const insight = getInsightForStatus(status, {
      tentativas: naoAtendeuCount + (status === "NAO_ATENDEU" ? 1 : 0),
      ultimo_canal: task?.channel ?? undefined,
      contact_name: task?.lead?.contact_name ?? undefined,
    });
    if (insight) {
      setActiveInsight(insight);
      setTimeout(() => setActiveInsight(null), 12000);
    }
  }

  function handleScheduleConfirm(iso: string) {
    if (!pickerTaskId) return;
    updateTask.mutate({ id: pickerTaskId, scheduled_at: iso, status: "PENDENTE" as any });
    const d = new Date(iso);
    const formatted = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ` ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    toast(`Contato agendado para ${formatted}`);
  }

  function handleScheduleClear() {
    if (!pickerTaskId) return;
    updateTask.mutate({ id: pickerTaskId, scheduled_at: null });
    toast("Agendamento removido");
  }

  function handleResultadoSave(taskId: string) {
    updateTask.mutate({ id: taskId, outcome: resultadoText });
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
  function handleMobileCall(task: Task) {
    if (!task.lead) return;
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
        <div className="flex flex-col items-center gap-3 opacity-70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Sincronizando tarefas...</p>
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
            <span className="text-emerald-500"><strong>{summary?.concluidos ?? 0}</strong> concluídos</span>
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
        value={pickerTask?.scheduled_at}
        onConfirm={handleScheduleConfirm}
        onClear={handleScheduleClear}
      />

      {/* Send Email Modal */}
        {emailTask && emailTask.lead && (
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
              Como foi a ligação com {postCallTask?.lead?.company_name}?
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
      <div className="flex-1 overflow-auto">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-60">
            <ListTodo className="w-10 h-10 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-sm font-semibold text-foreground">Fila zerada</h3>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-[250px]">
              {filter === "ALL"
                ? "Nenhum lead pendente para hoje. Adicione mais leads pelo Pipeline para continuar a prospecção."
                : "Não há tarefas com este status no momento."}
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
                    const contactStyle = getContactStyle(task.scheduled_at);
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
                            onClick={() => task.lead && setSelectedLeadId(task.lead.id)}
                            className="text-left w-full"
                          >
                            <Tooltip content="Abrir cartão do lead">
                              <div className="text-sm font-medium text-foreground hover:text-accent hover:underline">{task.lead?.company_name}</div>
                            </Tooltip>
                            {task.lead?.niche && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{task.lead.niche}</div>}
                          </button>
                        </td>
                        {/* PRR */}
                        <td className="px-3 py-2.5"><PRRBadge tier={task.lead?.prr_tier ?? null} score={task.lead?.prr_score ?? null} /></td>
                        {/* ICP */}
                        <td className="px-3 py-2.5"><span className="text-xs text-muted-foreground">{task.lead?.icp_score != null ? `${task.lead.icp_score}/14` : "—"}</span></td>
                        {/* Contato (new) */}
                        <td className="px-3 py-2.5">
                          <ContactPills
                            task={task}
                            onEmailClick={() => task.lead?.email && setEmailTask(task)}
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
                            <button onClick={() => { setEditingResultado(task.id); setResultadoText(task.outcome ?? ""); }} className={`w-full text-left text-xs transition-colors truncate max-w-[200px] ${task.outcome ? "text-foreground font-medium hover:text-accent" : "text-muted-foreground italic hover:text-foreground"}`}>{task.outcome || "O que aconteceu?"}</button>
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
                                  updateTask.mutate({ id: task.id, scheduled_at: null });
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
                const contactStyle = getContactStyle(task.scheduled_at);
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
                        <PRRBadge tier={task.lead?.prr_tier ?? null} score={task.lead?.prr_score ?? null} />
                        <span className="text-sm font-semibold text-foreground truncate">
                          {task.lead?.company_name}
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
                    {(task.lead?.niche || task.lead?.city) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {task.lead.niche}{task.lead.niche && task.lead.city ? " · " : ""}{task.lead.city}
                      </p>
                    )}

                    {/* Line 3: Contact pills */}
                    <div className="mt-2">
                      <ContactPills
                        task={task}
                        onEmailClick={() => task.lead?.email && setEmailTask(task)}
                        isMobile={true}
                      />
                    </div>

                    {/* Line 4: Resultado */}
                    <div className="mt-2">
                      {editingResultado === task.id ? (
                        <input autoFocus type="text" value={resultadoText} onChange={(e) => setResultadoText(e.target.value)} onBlur={() => handleResultadoSave(task.id)} onKeyDown={(e) => { if (e.key === "Enter") handleResultadoSave(task.id); if (e.key === "Escape") setEditingResultado(null); }} className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none" placeholder="O que aconteceu?" />
                      ) : (
                        <button onClick={() => { setEditingResultado(task.id); setResultadoText(task.outcome ?? ""); }} className={`text-xs ${task.outcome ? "text-foreground" : "text-muted-foreground italic"}`}>
                          {task.outcome ? `Resultado: ${task.outcome}` : "O que aconteceu? \u270F\uFE0F"}
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
                      {task.lead?.whatsapp && (
                        <button
                          onClick={() => window.open(`https://wa.me/${formatWaNumber(task.lead?.whatsapp!)}`, "_blank")}
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
      {/* Lead Sidebar */}
      <LeadSidebar leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
