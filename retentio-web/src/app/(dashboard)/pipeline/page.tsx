"use client";

import { useState, useEffect } from "react";
import { useAllLeads } from "@/hooks/use-leads";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { PipelineListView } from "@/components/kanban/PipelineListView";
import { LeadSidebar } from "@/components/kanban/LeadSidebar";
import { BulkAssignModal } from "@/components/kanban/BulkAssignModal";
import { ImportModal } from "@/components/lead/ImportModal";
import { CreateLeadModal } from "@/components/lead/CreateLeadModal";
import { useKanbanStore } from "@/lib/stores/kanban.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useTeamMembers } from "@/hooks/use-team";
import type { Lead } from "@/lib/types";
import { Upload, Plus, UsersRound, LayoutGrid, List } from "lucide-react";

export default function PipelinePage() {
  const { user } = useAuthStore();
  const [sdrFilter, setSdrFilter] = useState<string>("");
  const { data: leadsData, isLoading, error } = useAllLeads(sdrFilter || undefined);
  const { data: teamMembers } = useTeamMembers();
  const { columns, selectedLeadId, setSelectedLeadId, setLeadsByStatus } = useKanbanStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewFormat, setViewFormat] = useState<"kanban" | "list">("kanban");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);

  const isManagerOrOwner = user?.role === "MANAGER" || user?.role === "OWNER";
  const sdrs = teamMembers?.filter((m) => m.role === "SDR") || [];

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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:px-6 lg:py-4">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-foreground">Pipeline</h1>
            <p className="text-xs lg:text-sm text-muted-foreground">
              {Object.values(columns).reduce((sum, col) => sum + col.length, 0)} leads no funil
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-surface p-1 mr-2">
              <button
                onClick={() => setViewFormat("kanban")}
                className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
                  viewFormat === "kanban" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground hover:bg-surface-raised"
                }`}
                title="Visão Kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewFormat("list")}
                className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
                  viewFormat === "list" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground hover:bg-surface-raised"
                }`}
                title="Visão em Lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            {isManagerOrOwner && sdrs.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <UsersRound className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <select
                  value={sdrFilter}
                  onChange={(e) => setSdrFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs lg:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="">Todos os SDRs</option>
                  {sdrs.map((sdr) => (
                    <option key={sdr.user.id} value={sdr.id}>
                      {sdr.user.name.split(" ")[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {isManagerOrOwner && viewFormat === "list" && selectedIds.length > 0 && (
              <button
                onClick={() => setBulkAssignModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs lg:text-sm font-medium text-accent
                  shadow-sm transition-colors hover:bg-accent/20 focus:ring-2 focus:ring-accent/50 outline-none"
              >
                Atribuir {selectedIds.length}
              </button>
            )}

            {isManagerOrOwner && (
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs lg:text-sm font-medium text-foreground
                  shadow-sm transition-colors hover:border-accent hover:text-accent focus:ring-2 focus:ring-accent/50 outline-none"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </button>
            )}
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover focus:ring-2 focus:ring-accent/50 outline-none"
            >
              <Plus className="h-4 w-4" />
              <span>Novo <span className="hidden sm:inline">Lead</span></span>
            </button>
          </div>
        </div>

        {/* Kanban / List Toggle View */}
        {viewFormat === "kanban" ? (
          <KanbanBoard onSelectLead={setSelectedLeadId} />
        ) : (
          <PipelineListView 
            leads={leads} 
            onSelectLead={setSelectedLeadId}
            selectedIds={selectedIds}
            onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])}
            onSelectAll={() => setSelectedIds(prev => prev.length === leads.length ? [] : leads.map(l => l.id))}
            showCheckboxes={isManagerOrOwner}
          />
        )}
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

      {/* Modal de Criação Manual */}
      <CreateLeadModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {/* Modal de Atribuição em Massa */}
      {isManagerOrOwner && (
        <BulkAssignModal
          open={bulkAssignModalOpen}
          onOpenChange={setBulkAssignModalOpen}
          selectedIds={selectedIds}
          onSuccess={() => {
            setBulkAssignModalOpen(false);
            setSelectedIds([]);
          }}
        />
      )}
    </div>
  );
}
