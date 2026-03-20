"use client";

import { useState } from "react";
import { useHandoffs, useAcceptHandoff, useReturnHandoff } from "@/hooks/use-handoffs";
import { useAuthStore } from "@/lib/stores/auth.store";
import { 
  ArrowRightLeft, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  User, 
  Building2, 
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import type { HandoffBriefing, HandoffStatus, LeadStatus } from "@/lib/types";

export default function HandoffsPage() {
  const { data: handoffs, isLoading } = useHandoffs();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<HandoffStatus | "TODOS">("PENDENTE");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHandoffs = handoffs?.filter(h => 
    activeTab === "TODOS" ? true : h.status === activeTab
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 opacity-70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Sincronizando handoffs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-accent" />
            Handoffs (SDR → Closer)
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie as passagens de bastão para fechamento</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border bg-surface px-6 py-2">
        {(["PENDENTE", "ACEITO", "DEVOLVIDO", "TODOS"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab
                ? "bg-accent text-white"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {!filteredHandoffs || filteredHandoffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 opacity-60">
              <ArrowRightLeft className="w-10 h-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-sm font-semibold text-foreground">Sem handoffs na fila</h3>
              <p className="text-xs text-muted-foreground mt-1 text-center max-w-[250px]">
                Nenhum handoff encontrado nesta categoria.
              </p>
            </div>
          ) : (
            filteredHandoffs.map((handoff) => {
              const isGestor = user?.role === "MANAGER" || user?.role === "OWNER";
              return (
                <HandoffCard 
                  key={handoff.id} 
                  handoff={handoff} 
                  isExpanded={expandedId === handoff.id}
                  onToggle={() => setExpandedId(expandedId === handoff.id ? null : handoff.id)}
                  isCloser={user?.role === "CLOSER" || isGestor}
                  isGestor={isGestor}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function HandoffCard({ 
  handoff, 
  isExpanded, 
  onToggle,
  isCloser,
  isGestor 
}: { 
  handoff: HandoffBriefing; 
  isExpanded: boolean; 
  onToggle: () => void;
  isCloser: boolean;
  isGestor: boolean;
}) {
  const accept = useAcceptHandoff();
  const returnHandoff = useReturnHandoff();

  const handleReturn = () => {
    const reason = window.prompt("Motivo da devolução (mín. 10 caracteres):");
    if (!reason || reason.length < 10) return;
    returnHandoff.mutate({ id: handoff.id, reason, reentry_status: "FOLLOW_UP" });
  };

  return (
    <div className={`
      rounded-xl border transition-all duration-200 overflow-hidden
      ${isExpanded ? "border-accent shadow-lg bg-surface-raised" : "border-border bg-surface hover:border-accent/40"}
    `}>
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-4 flex-1">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            handoff.status === "PENDENTE" ? "bg-amber-500/10 text-amber-500" :
            handoff.status === "ACEITO" ? "bg-emerald-500/10 text-emerald-500" :
            "bg-red-500/10 text-red-500"
          }`}>
            {handoff.status === "PENDENTE" ? <Clock className="h-5 w-5" /> :
             handoff.status === "ACEITO" ? <CheckCircle2 className="h-5 w-5" /> :
             <RotateCcw className="h-5 w-5" />}
          </div>
          
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              {handoff.briefing_data.company}
              <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">
                {handoff.status}
              </Badge>
            </h3>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                SDR: {handoff.sdr?.user.name}
              </span>
              <span>•</span>
              <span>Enviado: {format(new Date(handoff.created_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {handoff.status === "PENDENTE" && isCloser && (
            <div className="flex items-center gap-2 mr-4">
              <Button 
                size="sm" 
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                onClick={(e) => { e.stopPropagation(); accept.mutate(handoff.id); }}
                disabled={accept.isPending}
              >
                Aceitar
              </Button>
            </div>
          )}
          {handoff.status === "ACEITO" && isCloser && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 text-red-500 border-red-500/30 hover:bg-red-500/10 gap-1"
              onClick={(e) => { e.stopPropagation(); handleReturn(); }}
              disabled={returnHandoff.isPending}
            >
              Devolver
            </Button>
          )}
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50 bg-surface/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Briefing Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> Briefing da Empresa
                </h4>
                <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Segmento:</span>
                    <span className="text-xs font-medium">{handoff.briefing_data.segment || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Tamanho:</span>
                    <span className="text-xs font-medium">{handoff.briefing_data.size || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">ICP Score:</span>
                    <span className="text-xs font-bold text-accent">{handoff.briefing_data.icp_score}/14</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Contato Decisor
                </h4>
                <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
                  <p className="text-xs font-bold">{handoff.briefing_data.contact.name}</p>
                  <p className="text-xs text-muted-foreground">{handoff.briefing_data.contact.role}</p>
                  <div className="pt-1 flex gap-2">
                    {handoff.briefing_data.contact.email && <Badge variant="secondary" className="text-[9px]">Email</Badge>}
                    {handoff.briefing_data.contact.whatsapp && <Badge variant="secondary" className="text-[9px]">WhatsApp</Badge>}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Actions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Notas Estratégicas
                </h4>
                <div className="rounded-lg border border-border bg-surface p-3 min-h-[100px]">
                  <p className="text-xs text-foreground whitespace-pre-wrap">
                    {handoff.briefing_data.custom_notes || "Nenhuma nota adicional fornecida."}
                  </p>
                </div>
              </div>

              {handoff.status === "DEVOLVIDO" && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
                  <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Motivo da Devolução</p>
                  <p className="text-xs text-red-700 dark:text-red-300">{handoff.return_reason}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs text-accent border-accent/20 hover:bg-accent/10">
                  <Link href={`/leads/${handoff.lead_id}`} target="_blank">
                    <ExternalLink className="h-3 w-3" />
                    Abrir histórico completo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
