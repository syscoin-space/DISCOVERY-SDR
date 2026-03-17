import { create } from "zustand";
import type { Lead, LeadStatus } from "@/lib/types";

interface KanbanState {
  columns: Record<LeadStatus, Lead[]>;
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
      CONTA_FRIA: [],
      EM_PROSPECCAO: [],
      FOLLOW_UP: [],
      REUNIAO_AGENDADA: [],
      OPORTUNIDADE_QUALIFICADA: [],
      NUTRICAO: [],
      SEM_PERFIL: [],
  },
  draggedLeadId: null,
  selectedLeadId: null,

  setLeadsByStatus: (leads) => {
    const grouped: Record<LeadStatus, Lead[]> = {
      CONTA_FRIA: [],
      EM_PROSPECCAO: [],
      FOLLOW_UP: [],
      REUNIAO_AGENDADA: [],
      OPORTUNIDADE_QUALIFICADA: [],
      NUTRICAO: [],
      SEM_PERFIL: [],
    };
    
    // Deduplicate leads by id
    const seen = new Set<string>();
    const unique = leads.filter(l => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });

    for (const lead of unique) {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      }
    }
    // Sort each column by prr_score descending
    for (const key of Object.keys(grouped) as LeadStatus[]) {
      grouped[key].sort(
        (a, b) => (b.prr_score ?? 0) - (a.prr_score ?? 0)
      );
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
        (a, b) => (b.prr_score ?? 0) - (a.prr_score ?? 0)
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
      const leadIndex = targetCol.findIndex((l) => l.id === leadId);
      if (leadIndex === -1) return state;

      const lead = { ...targetCol[leadIndex], status: originalStatus };
      const newTarget = targetCol.filter((_, i) => i !== leadIndex);
      const newOriginal = [...state.columns[originalStatus], lead].sort(
        (a, b) => (b.prr_score ?? 0) - (a.prr_score ?? 0)
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
