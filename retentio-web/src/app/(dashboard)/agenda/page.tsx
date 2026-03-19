"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  getDay,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Video,
  ExternalLink,
  Copy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/shared/Toast";
import { useRouter } from "next/navigation";
import {
  useAgenda,
  useClosers,
  type AgendaReuniao,
  type AgendaContato,
  type AgendaStep,
  type GoogleCalEvent,
} from "@/hooks/use-agenda";

// ─── Unified event type ─────────────────────────────────────────────

type EventKind = "reuniao" | "contato" | "step" | "google";

interface CalEvent {
  id: string;
  kind: EventKind;
  title: string;
  subtitle: string;
  start: Date;
  end: Date;
  raw: AgendaReuniao | AgendaContato | AgendaStep | GoogleCalEvent;
}

const KIND_STYLES: Record<EventKind, { border: string; bg: string; dot: string }> = {
  reuniao: { border: "border-l-emerald-500", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  contato: { border: "border-l-amber-500", bg: "bg-amber-500/10", dot: "bg-amber-500" },
  step: { border: "border-l-blue-500", bg: "bg-blue-500/10", dot: "bg-blue-500" },
  google: { border: "border-l-red-400", bg: "bg-red-400/10", dot: "bg-red-400" },
};

const KIND_LABELS: Record<EventKind, string> = {
  reuniao: "Reunião",
  contato: "Contato",
  step: "Cadência",
  google: "Google",
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7-20
const WEEK_DAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

// ─── Helpers ────────────────────────────────────────────────────────

function normalizeEvents(data: ReturnType<typeof useAgenda>["data"]): CalEvent[] {
  if (!data) return [];
  const events: CalEvent[] = [];

  for (const r of data.reunioes) {
    events.push({
      id: `r-${r.id}`,
      kind: "reuniao",
      title: r.lead?.company_name ?? r.titulo,
      subtitle: r.titulo,
      start: new Date(r.inicio),
      end: new Date(r.fim),
      raw: r,
    });
  }

  for (const c of data.contatos) {
    if (!c.proximo_contato) continue;
    const s = new Date(c.proximo_contato);
    events.push({
      id: `c-${c.id}`,
      kind: "contato",
      title: c.lead?.company_name ?? "Contato",
      subtitle: c.canal ? `${c.canal}` : "Contato agendado",
      start: s,
      end: new Date(s.getTime() + 30 * 60000),
      raw: c,
    });
  }

  for (const st of data.steps) {
    const s = new Date(st.scheduled_at);
    events.push({
      id: `s-${st.id}`,
      kind: "step",
      title: st.lead_cadence?.lead?.company_name ?? "Step",
      subtitle: `${st.cadence_step?.cadence?.name ?? "Cadência"} — Step ${st.cadence_step?.step_order}`,
      start: s,
      end: new Date(s.getTime() + 15 * 60000),
      raw: st,
    });
  }

  for (const g of data.google_events) {
    events.push({
      id: `g-${g.id}`,
      kind: "google",
      title: g.summary,
      subtitle: "Google Calendar",
      start: new Date(g.start),
      end: new Date(g.end),
      raw: g,
    });
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function AgendaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [closerId, setCloserId] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Date ranges
  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const rangeStart = view === "day" ? dayStart : view === "week" ? weekStart : monthStart;
  const rangeEnd = view === "day" ? dayEnd : view === "week" ? weekEnd : monthEnd;

  const { data, isLoading } = useAgenda(
    rangeStart.toISOString(),
    rangeEnd.toISOString(),
    closerId,
  );

  const { data: closers } = useClosers();
  const events = useMemo(() => normalizeEvents(data), [data]);

  // Navigation
  const goNext = () => {
    setCurrentDate((d) => (view === "day" ? addDays(d, 1) : view === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  };
  const goPrev = () => {
    setCurrentDate((d) => (view === "day" ? subDays(d, 1) : view === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  };
  const goToday = () => setCurrentDate(new Date());

  // Week days
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart.toISOString(), weekEnd.toISOString()],
  );

  // Mobile: 3 days
  const mobileDays = useMemo(() => {
    const today = new Date();
    return [subDays(today, 1), today, addDays(today, 1)];
  }, []);

  const displayDays = view === "day" ? [currentDate] : isMobile && view === "week" ? mobileDays : weekDays;

  // Events for a specific day
  const eventsForDay = useCallback(
    (day: Date) => events.filter((e) => isSameDay(e.start, day)),
    [events],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Agenda</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("day")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-border ${
                  view === "day"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:bg-surface-raised"
                }`}
              >
                Dia
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-border ${
                  view === "week"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:bg-surface-raised"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "month"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:bg-surface-raised"
                }`}
              >
                Mês
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface-raised transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
              {view === "day"
                ? format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                : view === "week"
                ? `${format(weekStart, "dd MMM", { locale: ptBR })} — ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`
                : format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface-raised transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-raised transition-colors"
            >
              Hoje
            </button>
          </div>

          {/* Closer selector */}
          <div className="flex items-center gap-2">
            {closers && closers.length > 0 && (
              <select
                value={closerId ?? ""}
                onChange={(e) => setCloserId(e.target.value || undefined)}
                className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">Minha agenda</option>
                {closers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          {(Object.keys(KIND_STYLES) as EventKind[]).map((kind) => (
            <div key={kind} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${KIND_STYLES[kind].dot}`} />
              {KIND_LABELS[kind]}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <WeekSkeleton />
        ) : view === "week" || view === "day" ? (
          <WeekView
            days={displayDays}
            events={events}
            eventsForDay={eventsForDay}
            onEventClick={setSelectedEvent}
            isMobile={isMobile}
          />
        ) : (
          <MonthView
            currentDate={currentDate}
            events={events}
            eventsForDay={eventsForDay}
            onEventClick={setSelectedEvent}
            onDayClick={(day) => {
              setCurrentDate(day);
              setView("week");
            }}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// ─── Week View ──────────────────────────────────────────────────────

function computeEventLayout(eventsOfDay: CalEvent[]) {
  const sorted = [...eventsOfDay].sort((a, b) => {
    if (a.start.getTime() === b.start.getTime()) {
      return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime()); // longest first
    }
    return a.start.getTime() - b.start.getTime();
  });

  const layoutInfo = new Map<string, { col: number; maxCols: number }>();

  // Helper para processar uma ilha de eventos (blocos que estão conectados por sobreposição)
  const processIsland = (island: CalEvent[]) => {
    const columns: CalEvent[][] = [];
    for (const evt of island) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastEvent = col[col.length - 1];
        // Adiciona 1 minuto de respiro
        if (lastEvent.end.getTime() <= evt.start.getTime() + 60000) {
          col.push(evt);
          layoutInfo.set(evt.id, { col: i, maxCols: 1 }); // placeholder maxCols
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([evt]);
        layoutInfo.set(evt.id, { col: columns.length - 1, maxCols: 1 });
      }
    }

    // Todos na ilha terão a largura baseada na coluna máxima DESTA ilha
    const totalCols = Math.max(1, columns.length);
    for (const evt of island) {
      const info = layoutInfo.get(evt.id)!;
      info.maxCols = totalCols;
      layoutInfo.set(evt.id, info);
    }
  };

  let currentIsland: CalEvent[] = [];
  let islandMaxEnd = 0;

  for (const evt of sorted) {
    if (currentIsland.length === 0) {
      currentIsland.push(evt);
      islandMaxEnd = evt.end.getTime();
    } else {
      if (evt.start.getTime() <= islandMaxEnd + 60000) {
        currentIsland.push(evt);
        islandMaxEnd = Math.max(islandMaxEnd, evt.end.getTime());
      } else {
        processIsland(currentIsland);
        currentIsland = [evt];
        islandMaxEnd = evt.end.getTime();
      }
    }
  }

  if (currentIsland.length > 0) {
    processIsland(currentIsland);
  }

  return layoutInfo;
}

function WeekView({
  days,
  events,
  eventsForDay,
  onEventClick,
  isMobile,
}: {
  days: Date[];
  events: CalEvent[];
  eventsForDay: (day: Date) => CalEvent[];
  onEventClick: (e: CalEvent) => void;
  isMobile: boolean;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const nowHour = now.getHours() + now.getMinutes() / 60;

  // Pre-calculate layouts for all days
  const layoutByDay = useMemo(() => {
    const map = new Map<string, Map<string, { col: number; maxCols: number }>>();
    for (const d of days) {
      const dayStr = d.toISOString();
      map.set(dayStr, computeEventLayout(eventsForDay(d)));
    }
    return map;
  }, [days, eventsForDay]);

  return (
    <div className="relative min-h-full">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `48px repeat(${days.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        <div className="sticky top-0 z-30 border-b border-border bg-surface" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`sticky top-0 z-30 flex flex-col items-center border-b border-l border-border py-2 ${
              isToday(day) ? "bg-accent/5" : "bg-surface"
            }`}
          >
            <span className="text-[10px] uppercase text-muted-foreground font-medium">
              {WEEK_DAYS_SHORT[getDay(day)]}
            </span>
            <span
              className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                isToday(day)
                  ? "bg-accent text-white"
                  : "text-foreground"
              }`}
            >
              {format(day, "d")}
            </span>
          </div>
        ))}

        {/* Hour rows */}
        {HOURS.map((hour) => (
          <HourRow
            key={hour}
            hour={hour}
            days={days}
            events={events}
            now={now}
            nowHour={nowHour}
            onEventClick={onEventClick}
            layoutByDay={layoutByDay}
          />
        ))}
      </div>
    </div>
  );
}

function HourRow({
  hour,
  days,
  events,
  now,
  nowHour,
  onEventClick,
  layoutByDay,
}: {
  hour: number;
  days: Date[];
  events: CalEvent[];
  now: Date;
  nowHour: number;
  onEventClick: (e: CalEvent) => void;
  layoutByDay: Map<string, Map<string, { col: number; maxCols: number }>>;
}) {
  return (
    <>
      {/* Time label */}
      <div className="relative border-b border-border/50 h-14 flex items-start justify-end pr-2 pt-0.5">
        <span className="text-[10px] text-muted-foreground font-medium">
          {String(hour).padStart(2, "0")}:00
        </span>
      </div>

      {/* Day cells */}
      {days.map((day) => {
        const dayStr = day.toISOString();
        const layoutMap = layoutByDay.get(dayStr);
        const dayEvents = events.filter((e) => {
          if (!isSameDay(e.start, day)) return false;
          const eHour = e.start.getHours();
          return eHour === hour;
        });

        const showNowLine = isToday(day) && hour === Math.floor(nowHour) && nowHour >= 7 && nowHour <= 20;
        const nowOffset = showNowLine ? ((nowHour - hour) * 100) : 0;

        return (
          <div
            key={dayStr}
            className={`relative border-b border-l border-border/50 h-14 ${
              isToday(day) ? "bg-accent/[0.03]" : ""
            }`}
          >
            {/* Now line */}
            {showNowLine && (
              <div
                className="absolute left-0 right-0 z-20 flex items-center"
                style={{ top: `${nowOffset}%` }}
              >
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px]" />
                <div className="h-[2px] flex-1 bg-red-500" />
              </div>
            )}

            {/* Events */}
            {dayEvents.map((evt) => {
              const layout = layoutMap?.get(evt.id) || { col: 0, maxCols: 1 };
              const widthPct = 100 / layout.maxCols;
              const leftPct = layout.col * widthPct;

              const durationMin = (evt.end.getTime() - evt.start.getTime()) / 60000;
              const heightPx = Math.max(24, (durationMin / 60) * 56);
              const startMin = evt.start.getMinutes();
              const topPx = (startMin / 60) * 56;
              const style = KIND_STYLES[evt.kind];

              return (
                <button
                  key={evt.id}
                  onClick={() => onEventClick(evt)}
                  className={`absolute z-10 rounded border-l-[3px] px-1.5 py-0.5 text-left overflow-hidden transition-shadow hover:shadow-md cursor-pointer ${style.border} ${style.bg} border-y border-r border-border/50`}
                  style={{ 
                    top: topPx, 
                    height: heightPx,
                    left: `calc(${leftPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`
                  }}
                  title={`${evt.title} — ${format(evt.start, "HH:mm")} - ${format(evt.end, "HH:mm")}`}
                >
                  <p className="text-[10px] font-semibold text-foreground truncate leading-tight">
                    {evt.title}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate leading-tight">
                    {format(evt.start, "HH:mm")}
                  </p>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ─── Month View ─────────────────────────────────────────────────────

function MonthView({
  currentDate,
  events,
  eventsForDay,
  onEventClick,
  onDayClick,
  isMobile,
}: {
  currentDate: Date;
  events: CalEvent[];
  eventsForDay: (day: Date) => CalEvent[];
  onEventClick: (e: CalEvent) => void;
  onDayClick: (day: Date) => void;
  isMobile: boolean;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Build grid starting from Monday
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="p-2 sm:p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium uppercase text-muted-foreground py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 border border-border rounded-xl overflow-hidden">
        {allDays.map((day) => {
          const dayEvts = eventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`relative border-b border-r border-border p-1.5 text-left transition-colors hover:bg-surface-raised ${
                isMobile ? "min-h-[52px]" : "min-h-[80px]"
              } ${!isCurrentMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  today
                    ? "bg-accent text-white font-bold"
                    : "font-semibold text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>

              {isMobile ? (
                /* Mobile: colored dots */
                dayEvts.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {dayEvts.slice(0, 4).map((evt) => (
                      <span
                        key={evt.id}
                        className={`h-1.5 w-1.5 rounded-full ${KIND_STYLES[evt.kind].dot}`}
                      />
                    ))}
                    {dayEvts.length > 4 && (
                      <span className="text-[8px] text-muted-foreground">
                        +{dayEvts.length - 4}
                      </span>
                    )}
                  </div>
                )
              ) : (
                /* Desktop: event pills */
                <div className="mt-1 space-y-0.5">
                  {dayEvts.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(evt);
                      }}
                      className={`rounded px-1 py-0.5 text-[9px] font-medium truncate cursor-pointer ${KIND_STYLES[evt.kind].bg} text-foreground`}
                    >
                      {evt.title}
                    </div>
                  ))}
                  {dayEvts.length > 3 && (
                    <p className="text-[9px] text-accent font-medium px-1">
                      +{dayEvts.length - 3} mais
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────

function WeekSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="w-12 h-14 rounded bg-surface-raised animate-pulse" />
          {Array.from({ length: 7 }).map((_, j) => (
            <div key={j} className="flex-1 h-14 rounded bg-surface-raised animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Event Detail Modal ─────────────────────────────────────────────

function EventDetailModal({
  event,
  open,
  onOpenChange,
}: {
  event: CalEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const dateStr = format(event.start, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR });
  const durationMin = Math.round((event.end.getTime() - event.start.getTime()) / 60000);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast("Copiado!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${KIND_STYLES[event.kind].dot}`}
            />
            {KIND_LABELS[event.kind]} — {event.title}
          </DialogTitle>
          <DialogDescription>
            {dateStr} ({durationMin} min)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reunião CRM */}
          {event.kind === "reuniao" && (() => {
            const r = event.raw as AgendaReuniao;
            return (
              <>
                <div className="space-y-2 text-sm">
                  <Row label="Lead" value={r.lead?.company_name} />
                  <Row label="Nicho" value={r.lead?.niche} />
                  {r.meet_link && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Google Meet</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={r.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                        >
                          <Video className="h-3 w-3" />
                          Abrir
                        </a>
                        <button
                          onClick={() => copyToClipboard(r.meet_link!)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {r.convidados.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Convidados</span>
                      <ul className="mt-1 space-y-0.5">
                        {r.convidados.map((email) => (
                          <li key={email} className="text-xs text-foreground">
                            • {email}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/leads/${r.lead_id}`);
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver lead
                  </Button>
                </div>
              </>
            );
          })()}

          {/* Contato */}
          {event.kind === "contato" && (() => {
            const c = event.raw as AgendaContato;
            return (
              <>
                <div className="space-y-2 text-sm">
                  <Row label="Empresa" value={`${c.lead?.company_name} (${c.lead?.niche ?? ""})`} />
                  <Row label="Canal" value={c.canal} />
                  <Row label="Status" value={c.lead?.status?.replace(/_/g, " ")} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      router.push("/hoje");
                    }}
                  >
                    Ir para Fila de Hoje
                  </Button>
                </div>
              </>
            );
          })()}

          {/* Cadence step */}
          {event.kind === "step" && (() => {
            const s = event.raw as AgendaStep;
            return (
              <>
                <div className="space-y-2 text-sm">
                  <Row label="Cadência" value={s.cadence_step?.cadence?.name} />
                  <Row label="Step" value={`Step ${s.cadence_step?.step_order} — ${s.cadence_step?.channel}`} />
                  <Row label="Lead" value={s.lead_cadence?.lead?.company_name} />
                  <Row label="Status" value={s.status} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/cadencias`);
                    }}
                  >
                    Ver cadência
                  </Button>
                </div>
              </>
            );
          })()}

          {/* Google Calendar */}
          {event.kind === "google" && (() => {
            const g = event.raw as GoogleCalEvent;
            return (
              <>
                <div className="space-y-2 text-sm">
                  {g.description && (
                    <div>
                      <span className="text-xs text-muted-foreground">Descrição</span>
                      <p className="text-xs text-foreground mt-0.5 line-clamp-4">
                        {g.description}
                      </p>
                    </div>
                  )}
                  {g.attendees.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Convidados</span>
                      <ul className="mt-1 space-y-0.5">
                        {g.attendees.map((email) => (
                          <li key={email} className="text-xs text-foreground">
                            • {email}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {g.meetLink && (
                    <a
                      href={g.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                    >
                      <Video className="h-3 w-3" />
                      Abrir Google Meet
                    </a>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
