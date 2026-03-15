"use client";

import { useState, useEffect } from "react";
import { useAllLeads } from "@/hooks/use-leads";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadSidebar } from "@/components/kanban/LeadSidebar";
import { ImportModal } from "@/components/lead/ImportModal";
import { useKanbanStore } from "@/lib/stores/kanban.store";
import type { Lead } from "@/lib/types";
import { Upload } from "lucide-react";

export default function PipelinePage() {
  const { data: leadsData, isLoading, error } = useAllLeads();
  const { columns, selectedLeadId, setSelectedLeadId, setLeadsByStatus } = useKanbanStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    if (leadsData) {
      const unique = leadsData.filter(
        (lead, i, self) => i === self.findIndex((l) => l.id === lead.id)
      );
      setLeads(unique);
      setLeadsByStatus(unique);
    }
  }, [leadsData, setLeadsByStatus]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2E86AB] border-t-transparent" />
          <p className="text-sm text-gray-500">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">
            Erro ao carregar leads
          </p>
          <p className="mt-1 text-xs text-red-500">
            {error instanceof Error ? error.message : "Tente novamente"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {Object.values(columns).reduce((sum, col) => sum + col.length, 0)} leads no funil
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground 
                shadow-sm transition-colors hover:border-accent hover:text-accent focus:ring-2 focus:ring-accent/50 outline-none"
            >
              <Upload className="h-4 w-4" />
              Importar
            </button>
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover focus:ring-2 focus:ring-accent/50 outline-none">
              + Novo Lead
            </button>
          </div>
        </div>

        {/* Kanban */}
        <KanbanBoard
          onSelectLead={setSelectedLeadId}
        />
      </div>

      {/* Sidebar de detalhes */}
      <LeadSidebar
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      {/* Modal de Importação */}
      <ImportModal 
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />
    </div>
  );
}
