"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Lead, LeadStatus } from "@/lib/types";
import { LeadCard } from "./LeadCard";
import { Inbox } from "lucide-react";

interface KanbanColumnProps {
  status: LeadStatus;
  label: string;
  color: string;
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
}

export function KanbanColumn({
  status,
  label,
  color,
  leads,
  onSelectLead,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const leadIds = leads.map((l) => l.id);

  return (
    <div className="flex h-full min-w-[280px] max-w-[280px] flex-shrink-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-2 mb-3">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="ml-auto rounded-full bg-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`
          flex flex-1 flex-col overflow-y-auto rounded-xl border border-dashed p-2 transition-colors
          ${isOver
            ? "border-accent/50 bg-accent/5"
            : leads.length === 0
            ? "border-border/30 bg-surface/20"
            : "border-border/50 bg-surface/50"
          }
        `}
        style={{ maxHeight: "calc(100vh - 220px)", gap: '0.5rem' }}
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 opacity-60">
              <Inbox className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
              <p className="text-xs font-medium text-muted-foreground">Nenhum lead nesta etapa</p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onSelect={onSelectLead}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
