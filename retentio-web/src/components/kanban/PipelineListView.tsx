import React, { useState, useMemo } from "react";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Mail, Phone, ExternalLink, MessageCircle, MoreVertical } from "lucide-react";
import { PotentialScoreBadge } from "@/components/shared/PotentialScoreBadge";
import { ICPBadge } from "@/components/shared/ICPBadge";

interface PipelineListViewProps {
  leads: Lead[];
  onSelectLead: (id: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  showCheckboxes: boolean;
}

type SortField = "company_name" | "status" | "created_at" | "operational_score" | "icp_score";
type SortOrder = "asc" | "desc";

export function PipelineListView({ 
  leads, 
  onSelectLead, 
  selectedIds, 
  onToggleSelect, 
  onSelectAll,
  showCheckboxes 
}: PipelineListViewProps) {
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // default is desc for new fields
    }
  };

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "created_at") {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (sortField === "company_name") {
        aVal = (a.company_name || "").toLowerCase();
        bVal = (b.company_name || "").toLowerCase();
      } else if (sortField === "status") {
        aVal = a.status;
        bVal = b.status;
      } else if (sortField === "operational_score") {
        aVal = a.operational_score || 0;
        bVal = b.operational_score || 0;
      } else if (sortField === "icp_score") {
        aVal = a.icp_score || 0;
        bVal = b.icp_score || 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, sortField, sortOrder]);

  return (
    <div className="flex-1 overflow-auto p-6 bg-background">
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] text-muted-foreground uppercase tracking-wider bg-surface-raised border-b border-border">
              <tr>
                {showCheckboxes && (
                  <th className="px-5 py-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-accent/40 bg-surface-raised p-2 accent-accent cursor-pointer"
                      checked={leads.length > 0 && selectedIds.length === leads.length}
                      onChange={onSelectAll}
                    />
                  </th>
                )}
                <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => handleSort("company_name")}>
                  <div className="flex items-center gap-1">Empresa <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-5 py-3 font-medium">Responsável</th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => handleSort("operational_score")}>
                  <div className="flex items-center gap-1">Potencial <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => handleSort("icp_score")}>
                  <div className="flex items-center gap-1">ICP <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-5 py-3 font-medium">Contato Principal</th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-1">Adicionado <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-5 py-3 font-medium flex justify-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => showCheckboxes ? onToggleSelect(lead.id) : onSelectLead(lead.id)}
                    className={`border-b border-border/50 hover:bg-surface-raised cursor-pointer transition-colors ${selectedIds.includes(lead.id) ? 'bg-accent/5' : ''}`}
                  >
                    {showCheckboxes && (
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-accent/40 bg-surface-raised p-2 accent-accent cursor-pointer"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => onToggleSelect(lead.id)}
                        />
                      </td>
                    )}
                    <td className="px-5 py-3 font-medium text-foreground" onClick={(e) => { e.stopPropagation(); onSelectLead(lead.id); }}>
                      <div className="flex flex-col">
                        <span>{lead.company_name}</span>
                        {lead.niche && <span className="text-[10px] text-muted-foreground font-normal">{lead.niche}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                        {lead.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {lead.sdr?.user ? (
                        <div className="flex items-center gap-2" title={lead.sdr.user.name}>
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent ring-1 ring-border">
                            {lead.sdr.user.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={lead.sdr.user.avatar_url} alt={lead.sdr.user.name} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              lead.sdr.user.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground hidden lg:block truncate max-w-[100px]">
                            {lead.sdr.user.name.split(" ")[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <PotentialScoreBadge tier={lead.fit_tier} score={lead.operational_score} />
                    </td>
                    <td className="px-5 py-3">
                      <ICPBadge score={lead.icp_score} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{lead.contact_name || "—"}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                          {lead.email && <Mail className="h-3 w-3" />}
                          {lead.whatsapp && <MessageCircle className="h-3 w-3" />}
                          {lead.phone && <Phone className="h-3 w-3" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {format(new Date(lead.created_at), "dd MMM, yy", { locale: ptBR })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end items-center gap-3">
                        <button className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
