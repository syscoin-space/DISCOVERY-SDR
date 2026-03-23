import { create } from "zustand";
import type { Lead, LeadStatus } from "@/lib/types";

interface KanbanState {
  columns: Partial<Record<LeadStatus, Lead[]>>;
  draggedLeadId: string | null;
  selectedLeadId: string | null;

  setLeadsByStatus: (leads: Lead[]) => void;
  setSelectedLeadId: (id: string | null) => void;
  moveLeadOptimistic: (
    leadId: string,
    fromStatus: LeadStatus,
    toStatus: LeadStatus
  ) => void;
  setDraggedLeadId: (id: string | null) => void;
  revertMove: (
    leadId: string,
    originalStatus: LeadStatus,
    targetStatus: LeadStatus
  ) => void;
}



export const useKanbanStore = create<KanbanState>((set) => ({
  columns: {
    BANCO: [],
    CONTA_FRIA: [],
    DISCOVERY: [],
    EM_PROSPECCAO: [],
    FOLLOW_UP: [],
    REUNIAO_MARCADA: [],
    PERDIDO: [],
  },
  draggedLeadId: null,
  selectedLeadId: null,

  setLeadsByStatus: (leads) => {
    const grouped: Partial<Record<LeadStatus, Lead[]>> = {
      BANCO: [],
      CONTA_FRIA: [],
      DISCOVERY: [],
      EM_PROSPECCAO: [],
      FOLLOW_UP: [],
      REUNIAO_MARCADA: [],
      PERDIDO: [],
    };
    
    // Deduplicate leads by id
    const seen = new Set<string>();
    const unique = leads.filter(l => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });

    for (const lead of unique) {
      const col = grouped[lead.status];
      if (col) {
        col.push(lead);
      }
    }
    // Sort each column by operational_score descending
    for (const key of Object.keys(grouped) as LeadStatus[]) {
      const col = grouped[key];
      if (col) {
        col.sort((a, b) => (b.operational_score ?? 0) - (a.operational_score ?? 0));
      }
    }
    set({ columns: grouped });
  },

  moveLeadOptimistic: (leadId, fromStatus, toStatus) => {
    set((state) => {
      const fromCol = state.columns[fromStatus];
      const toCol = state.columns[toStatus];
      if (!fromCol || !toCol) return state;
      const leadIndex = fromCol.findIndex((l) => l.id === leadId);
      if (leadIndex === -1) return state;

      const lead = { ...fromCol[leadIndex], status: toStatus };
      const newFrom = fromCol.filter((_, i) => i !== leadIndex);
      const newTo = [...toCol, lead].sort(
        (a, b) => (b.operational_score ?? 0) - (a.operational_score ?? 0)
      );

      return {
        columns: {
          ...state.columns,
          [fromStatus]: newFrom,
          [toStatus]: newTo,
        },
      };
    });
  },

  setDraggedLeadId: (id) => set({ draggedLeadId: id }),
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),

  revertMove: (leadId, originalStatus, targetStatus) => {
    set((state) => {
      const targetCol = state.columns[targetStatus];
      const originalCol = state.columns[originalStatus];
      if (!targetCol || !originalCol) return state;

      const leadIndex = targetCol.findIndex((l) => l.id === leadId);
      if (leadIndex === -1) return state;

      const lead = { ...targetCol[leadIndex], status: originalStatus };
      const newTarget = targetCol.filter((_, i) => i !== leadIndex);
      const newOriginal = [...originalCol, lead].sort(
        (a, b) => (b.operational_score ?? 0) - (a.operational_score ?? 0)
      );

      return {
        columns: {
          ...state.columns,
          [originalStatus]: newOriginal,
          [targetStatus]: newTarget,
        },
      };
    });
  },
}));
