"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import type { Lead, LeadStatus } from "@/lib/types";
import { FUNNEL_COLUMNS } from "@/lib/types";
import { useKanbanStore } from "@/lib/stores/kanban.store";
import { useUpdateLeadStatus } from "@/hooks/use-leads";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";
import { PotentialScoreBadge } from "@/components/shared/PotentialScoreBadge";
import { useAuthStore } from "@/lib/stores/auth.store";
import { ICPBadge } from "@/components/shared/ICPBadge";
import { MapPin, Search } from "lucide-react";

interface KanbanBoardProps {
  onSelectLead: (leadId: string) => void;
}

export function KanbanBoard({ onSelectLead }: KanbanBoardProps) {
  const {
    columns,
    moveLeadOptimistic,
    revertMove,
    draggedLeadId,
    setDraggedLeadId,
  } = useKanbanStore();

  const updateStatus = useUpdateLeadStatus();

  // Mobile: active column tab
  const [mobileColumn, setMobileColumn] = useState<LeadStatus>("BANCO" as LeadStatus);

  // Filters
  const { user } = useAuthStore();
  const discoveryEnabled = user?.tenant?.discovery_enabled ?? false;

  // Filters
  const [filterTier, setFilterTier] = useState<string | "ALL">("ALL");
  const [filterIcpMin, setFilterIcpMin] = useState<number>(0);
  const [filterPlatform, setFilterPlatform] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const allLeads = Object.values(columns).flat();

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setDraggedLeadId(event.active.id as string);
    },
    [setDraggedLeadId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedLeadId(null);

      if (!over) return;

      const leadId = active.id as string;
      const validStatuses = new Set<string>([
        "BANCO", "CONTA_FRIA", "DISCOVERY", "EM_PROSPECCAO", "FOLLOW_UP",
        "REUNIAO_MARCADA", "PERDIDO"
      ]);

      // Determine target status: over.id can be a column status or a lead id
      let targetStatus: LeadStatus;
      if (validStatuses.has(over.id as string)) {
        targetStatus = over.id as LeadStatus;
      } else {
        // Dropped over a lead card — find which column that lead belongs to
        let foundStatus: LeadStatus | null = null;
        for (const [status, statusLeads] of Object.entries(columns)) {
          if (statusLeads.some((l) => l.id === over.id)) {
            foundStatus = status as LeadStatus;
            break;
          }
        }
        if (!foundStatus) return;
        targetStatus = foundStatus;
      }

      // Find current status of the dragged lead
      let fromStatus: LeadStatus | null = null;
      for (const [status, statusLeads] of Object.entries(columns)) {
        if (statusLeads.some((l) => l.id === leadId)) {
          fromStatus = status as LeadStatus;
          break;
        }
      }

      if (!fromStatus || fromStatus === targetStatus) return;

      // Optimistic update
      moveLeadOptimistic(leadId, fromStatus, targetStatus);

      // API call
      updateStatus.mutate(
        { leadId, status: targetStatus },
        {
          onError: () => {
            revertMove(leadId, fromStatus!, targetStatus);
          },
        }
      );
    },
    [columns, moveLeadOptimistic, revertMove, setDraggedLeadId, updateStatus]
  );

  // Filter logic
  const filterLeads = useCallback(
    (statusLeads: Lead[]): Lead[] => {
      let filtered = statusLeads;

      if (filterTier !== "ALL") {
        filtered = filtered.filter((l) => l.fit_tier === filterTier);
      }
      if (filterIcpMin > 0) {
        filtered = filtered.filter(
          (l) => (l.icp_score ?? 0) >= filterIcpMin
        );
      }
      if (filterPlatform !== "ALL") {
        filtered = filtered.filter(
          (l) => l.ecommerce_platform === filterPlatform
        );
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (l) =>
            l.company_name.toLowerCase().includes(q) ||
            l.niche?.toLowerCase().includes(q) ||
            l.contact_name?.toLowerCase().includes(q)
        );
      }

      return filtered;
    },
    [filterTier, filterIcpMin, filterPlatform, search]
  );

  // Get unique platforms
  const platforms = Array.from(
    new Set(allLeads.map((l) => l.ecommerce_platform).filter(Boolean))
  ) as string[];

  // Find dragged lead for overlay
  const draggedLead = draggedLeadId
    ? allLeads.find((l) => l.id === draggedLeadId)
    : null;

  const mobileLeads = filterLeads(columns[mobileColumn] ?? []);

  useEffect(() => {
    console.log("Discovery SDR V2 UI Loaded - Score de Potencial Active");
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Filter Bar — desktop only */}
      <div className="hidden lg:flex flex-wrap items-center gap-4 border-b border-border bg-surface px-6 py-2">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Score de Potencial</label>
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="h-8 rounded-md border border-border bg-surface text-foreground px-2 py-1 text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors">
            <option value="ALL">Todos</option>
            <option value="A">Tier A</option>
            <option value="B">Tier B</option>
            <option value="C">Tier C</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">ICP</label>
          <select value={filterIcpMin} onChange={(e) => setFilterIcpMin(Number(e.target.value))} className="h-8 rounded-md border border-border bg-surface text-foreground px-2 py-1 text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors">
            <option value={0}>Todos</option>
            <option value={7}>≥ 7</option>
            <option value={9}>≥ 9</option>
            <option value={11}>≥ 11</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Plataforma</label>
          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="h-8 rounded-md border border-border bg-surface text-foreground px-2 py-1 text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors">
            <option value="ALL">Todas</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-56 rounded-md border border-border bg-surface text-foreground px-3 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors" />
        </div>
      </div>

      {/* Mobile: search bar */}
      <div className="lg:hidden px-4 py-2 border-b border-border bg-surface">
        <input type="text" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-surface-raised text-foreground px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent" />
      </div>

      {/* Mobile: column tabs */}
       <div className="lg:hidden flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-border bg-surface px-3 py-1.5">
        {FUNNEL_COLUMNS.filter(col => col.status !== 'DISCOVERY' || discoveryEnabled).map((col) => {
          const count = filterLeads(columns[col.status] ?? []).length;
          const isActive = mobileColumn === col.status;
          return (
            <button
              key={col.status}
              onClick={() => setMobileColumn(col.status as LeadStatus)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-white"
                  : "bg-surface-raised text-muted-foreground"
              }`}
              style={isActive ? { backgroundColor: col.color } : undefined}
            >
              {col.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Mobile: lead list */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {mobileLeads.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhum lead nesta coluna</p>
        ) : (
          mobileLeads.map((lead) => {
            const invalidValues = new Set(["N/A", "n/a", "Não encontrado", "Desconhecido", "null", "undefined", "\u2014", "-", ""]);
            const city = lead.city && !invalidValues.has(lead.city.trim()) ? lead.city : null;
            const state = lead.state && !invalidValues.has(lead.state.trim()) ? lead.state : null;

            return (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className="w-full text-left rounded-xl border border-border bg-surface p-3 active:bg-surface-raised transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{lead.company_name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <PotentialScoreBadge tier={lead.fit_tier} score={lead.operational_score} />
                    <ICPBadge score={lead.icp_score} />
                  </div>
                </div>
                {lead.niche && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.niche}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  {lead.ecommerce_platform && (
                    <span className="rounded-md bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground">{lead.ecommerce_platform}</span>
                  )}
                  {(city || state) && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />{city}{city && state ? " · " : ""}{state}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Desktop: Kanban Board */}
      <div className="hidden lg:flex flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 gap-3 overflow-x-auto p-4">
            {FUNNEL_COLUMNS.filter(col => col.status !== 'DISCOVERY' || discoveryEnabled).map((col) => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                color={col.color}
                leads={filterLeads(columns[col.status] ?? [])}
                onSelectLead={onSelectLead}
              />
            ))}
          </div>

          <DragOverlay>
            {draggedLead ? (
              <div className="rotate-2 scale-105 opacity-90">
                <LeadCard lead={draggedLead} onSelect={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
