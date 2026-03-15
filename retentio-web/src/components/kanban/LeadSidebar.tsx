"use client";

import { useLead, useInteractions, useCreateInteraction, useCalculatePrr } from "@/hooks/use-leads";
import { PRRBadge } from "@/components/shared/PRRBadge";
import { ICPBadge } from "@/components/shared/ICPBadge";
import { IntegrabilityBadge } from "@/components/shared/IntegrabilityBadge";
import { ChannelIcons } from "@/components/shared/ChannelIcons";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadSidebarProps {
  leadId: string | null;
  onClose: () => void;
}

export function LeadSidebar({ leadId, onClose }: LeadSidebarProps) {
  const { data: lead, isLoading } = useLead(leadId ?? undefined);
  const { data: interactions } = useInteractions(leadId ?? undefined);
  const createInteraction = useCreateInteraction();
  const calculatePrr = useCalculatePrr();

  const [note, setNote] = useState("");
  const [type, setType] = useState("NOTA");

  const handleCreateInteraction = async () => {
    if (!leadId || !note.trim()) return;
    await createInteraction.mutateAsync({
      leadId,
      payload: { type, body: note },
    });
    setNote("");
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto p-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2E86AB] border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500 font-medium">Carregando detalhes...</p>
          </div>
        )}

        {!isLoading && !lead && leadId && (
          <div className="flex flex-col items-center justify-center h-full py-20 px-10 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-[#1E3A5F]">Lead não encontrado</h3>
            <p className="text-sm text-gray-500 mt-2">
              Não conseguimos carregar as informações deste lead. Ele pode ter sido removido ou você não tem permissão para visualizá-lo.
            </p>
            <Button variant="outline" className="mt-6" onClick={onClose}>
              Fechar Sidebar
            </Button>
          </div>
        )}

        {lead && (
          <>
            <SheetHeader className="px-6 py-6 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                  {lead.status.replace(/_/g, " ")}
                </Badge>
                {lead.bloqueio_status === "ALERTA" && (
                  <Badge variant="destructive" className="animate-pulse">⚠️ ALERTA</Badge>
                )}
              </div>
              <SheetTitle className="text-2xl font-bold text-[#1E3A5F]">
                {lead.company_name}
              </SheetTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{lead.niche}</span>
                {lead.city && <span>• {lead.city}, {lead.state}</span>}
              </div>
            </SheetHeader>

            <Tabs defaultValue="perfil" className="mt-6">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="perfil">Perfil</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="perfil" className="space-y-6 pt-4 px-6 pb-10">
                {/* Badges Section */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">PRR Score</span>
                    <span className="text-xl font-bold text-[#1E3A5F]">{lead.prr_score ?? "—"}</span>
                    <PRRBadge tier={lead.prr_tier} score={lead.prr_score} />
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">ICP Score</span>
                    <span className="text-xl font-bold text-[#1E3A5F]">{lead.icp_score}/14</span>
                    <ICPBadge score={lead.icp_score} />
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">Plataforma</span>
                    <span className="text-sm font-bold text-[#1E3A5F] truncate w-full text-center">
                      {lead.ecommerce_platform ?? "N/A"}
                    </span>
                    <IntegrabilityBadge level={lead.integrability} />
                  </div>
                </div>

                {/* Info Grid */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">Informações Gerais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-xs text-gray-400">CNPJ</label>
                      <p className="font-medium">{lead.cnpj ?? "Não informado"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Email</label>
                      <p className="font-medium truncate">{lead.email ?? "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">WhatsApp</label>
                      <p className="font-medium">{lead.whatsapp ?? "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Contato</label>
                      <p className="font-medium">{lead.contact_name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <ChannelIcons
                      whatsapp={lead.whatsapp}
                      email={lead.email}
                      instagram={lead.instagram_handle}
                      linkedin={lead.linkedin_url}
                    />
                  </div>
                </div>

                {/* Diagnóstico */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">Diagnóstico Comercial</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center p-3 rounded-lg border">
                       <div>
                         <p className="text-xs text-gray-400">Base Estimada</p>
                         <p className="font-bold">{lead.estimated_base_size?.toLocaleString('pt-BR') ?? "—"} contatos</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs text-gray-400">Ticket Médio</p>
                         <p className="font-bold">R$ {lead.avg_ticket_estimated?.toLocaleString('pt-BR') ?? "—"}</p>
                       </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-xs text-gray-400">Ciclo de Recompra</p>
                      <p className="font-bold">{lead.prr_inputs?.recompra_cycle_days ? `${lead.prr_inputs.recompra_cycle_days} dias` : "Não informado"}</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-[#2E86AB] hover:bg-[#256e8f]"
                    onClick={() => calculatePrr.mutate(lead.id)}
                    disabled={calculatePrr.isPending}
                  >
                    {calculatePrr.isPending ? "Calculando..." : "Calcular PRR"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="pt-4 space-y-6 px-6 pb-10">
                {/* Registrar Interação */}
                <div className="p-4 rounded-lg bg-gray-50 border space-y-3">
                  <h4 className="text-xs font-bold text-[#1E3A5F] uppercase">Registrar Interação</h4>
                  <div className="flex gap-2">
                    <select 
                      value={type} 
                      onChange={(e) => setType(e.target.value)}
                      className="text-xs border rounded p-1 bg-white"
                    >
                      <option value="NOTA">Nota</option>
                      <option value="EMAIL">Email</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="LIGACAO">Ligação</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Descreva a interação..." 
                      className="flex-1 text-xs border rounded p-1"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateInteraction()}
                    />
                    <Button size="sm" onClick={handleCreateInteraction} disabled={createInteraction.isPending}>
                      Salvar
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  {interactions?.length === 0 ? (
                    <p className="text-center py-8 text-sm text-gray-400 italic">Nenhuma interação registrada ainda</p>
                  ) : (
                    interactions?.map((inter) => (
                      <div key={inter.id} className="relative pl-6 border-l-2 border-gray-100 pb-4 last:pb-0">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-[#2E86AB]" />
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline" className="text-[9px] font-bold">
                            {inter.type}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(inter.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{inter.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
