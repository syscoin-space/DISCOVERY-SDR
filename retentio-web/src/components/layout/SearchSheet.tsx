"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Drawer } from "vaul";
import { Search, X, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAllLeads } from "@/hooks/use-leads";
import { useKanbanStore } from "@/lib/stores/kanban.store";
import { PotentialScoreBadge } from "@/components/shared/PotentialScoreBadge";
import { ICPBadge } from "@/components/shared/ICPBadge";

interface SearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchSheet({ open, onOpenChange }: SearchSheetProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: leads } = useAllLeads();
  const { setSelectedLeadId } = useKanbanStore();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [open]);

  const invalidValues = new Set(["N/A", "n/a", "Não encontrado", "Desconhecido", "null", "undefined", "\u2014", "-", ""]);

  const filtered = useCallback(() => {
    if (!leads || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return leads
      .filter(
        (l) =>
          l.company_name.toLowerCase().includes(q) ||
          l.niche?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [leads, query])();

  function handleSelect(leadId: string) {
    onOpenChange(false);
    setSelectedLeadId(leadId);
    router.push("/pipeline");
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-surface outline-none max-h-[85vh]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <Drawer.Title className="sr-only">Buscar Leads</Drawer.Title>

          {/* Search input */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar lead, empresa, contato..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 pb-safe">
            {!query.trim() ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Digite para buscar leads
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum lead encontrado
              </p>
            ) : (
              <div className="space-y-2 pb-4">
                {filtered.map((lead) => {
                  const city = lead.city && !invalidValues.has(lead.city.trim()) ? lead.city : null;
                  const state = lead.state && !invalidValues.has(lead.state.trim()) ? lead.state : null;

                  return (
                    <button
                      key={lead.id}
                      onClick={() => handleSelect(lead.id)}
                      className="w-full text-left rounded-xl border border-border bg-surface-raised/50 p-3 active:bg-surface-raised transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {lead.company_name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <PotentialScoreBadge tier={lead.fit_tier} score={lead.operational_score} />
                          <ICPBadge score={lead.icp_score} />
                        </div>
                      </div>
                      {lead.niche && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {lead.niche}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {lead.ecommerce_platform && (
                          <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                            {lead.ecommerce_platform}
                          </span>
                        )}
                        {(city || state) && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {city}
                            {city && state ? " · " : ""}
                            {state}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
