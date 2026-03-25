"use client";

import { useLead, useInteractions, useCreateInteraction, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useCreateTouchpoint } from "@/hooks/use-touchpoints";
import TouchpointTimeline from "@/components/lead/TouchpointTimeline";
import { PotentialScoreBadge } from "@/components/shared/PotentialScoreBadge";
import { ICPBadge } from "@/components/shared/ICPBadge";
import { IntegrabilityBadge } from "@/components/shared/IntegrabilityBadge";
import { ChannelIcons } from "@/components/shared/ChannelIcons";
import { AiSuggestionReview } from "@/components/lead/AiSuggestionReview";
import {
  Sheet,
  SheetContent,
  SheetTitle
} from "@/components/ui/sheet";
import { Drawer } from "vaul";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { ExternalLink, Pencil, Check, X, Mail, Phone, Linkedin, MessageCircle, Calendar, Video, XCircle, Search, UserRound, Target, Trash2, ListChecks, PlayCircle, StopCircle } from "lucide-react";
import { getTierAInsight, getNextChannelSuggestion } from "@/lib/insights";
import { InsightBanner } from "@/components/shared/InsightToast";
import { useCalendarEvents, useCancelCalendarEvent } from "@/hooks/use-google";
import { useCadences, useEnrollLead, useUnenrollLead } from "@/hooks/use-cadences";
import Handlebars from "handlebars";

interface LeadSidebarProps {
  leadId: string | null;
  onClose: () => void;
}

// ─── Inline Editable Field ──────────────────────────────────────────

function EditableField({
  label,
  value,
  field,
  leadId,
  type = "text",
  placeholder = "—",
  openOnMount = false,
}: {
  label: string;
  value: string | null | undefined;
  field: string;
  leadId: string;
  type?: string;
  placeholder?: string;
  openOnMount?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const updateLead = useUpdateLead();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = useCallback(async () => {
    if (editValue !== (value ?? "")) {
      await updateLead.mutateAsync({
        leadId,
        payload: { [field]: editValue || null },
      });
    }
    setEditing(false);
  }, [editValue, value, field, leadId, updateLead]);

  const handleCancel = () => {
    setEditValue(value ?? "");
    setEditing(false);
  };

  useEffect(() => {
    if ((typeof (arguments) !== 'undefined') && (arguments as any)) {
      // noop to satisfy lint in TSX-only file
    }
  }, []);

  useEffect(() => {
    if ((openOnMount as any) && !editing) {
      setEditValue(value ?? "");
      setEditing(true);
      // focus after render
      setTimeout(() => inputRef?.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOnMount, leadId]);

  if (editing) {
    return (
      <div>
        <label className="text-[10px] text-muted-foreground uppercase font-medium">{label}</label>
        <div className="flex items-center gap-1 mt-0.5">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="flex-1 rounded border border-accent/40 bg-surface-raised px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button onClick={handleSave} className="text-green-500 hover:text-green-600 p-0.5">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleCancel} className="text-red-400 hover:text-red-500 p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group cursor-pointer" onClick={() => { setEditValue(value ?? ""); setEditing(true); }}>
      <label className="text-[10px] text-muted-foreground uppercase font-medium">{label}</label>
      <div className="flex items-center gap-1.5 mt-0.5">
        <p className="text-sm font-medium text-foreground truncate">
          {value || <span className="text-muted-foreground italic">{placeholder}</span>}
        </p>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </div>
  );
}

// ─── Interaction type config ────────────────────────────────────────

const INTERACTION_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  EMAIL: { icon: Mail, color: "text-blue-500 border-blue-500/30 bg-blue-500/10" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-500 border-green-500/30 bg-green-500/10" },
  LIGACAO: { icon: Phone, color: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  LINKEDIN: { icon: Linkedin, color: "text-blue-700 border-blue-700/30 bg-blue-700/10" },
  REUNIAO: { icon: ExternalLink, color: "text-purple-500 border-purple-500/30 bg-purple-500/10" },
  NOTA: { icon: Pencil, color: "text-gray-500 border-gray-500/30 bg-gray-500/10" },
};

// ─── Main Component ─────────────────────────────────────────────────

export function LeadSidebar({ leadId, onClose }: LeadSidebarProps) {
  const { data: lead, isLoading } = useLead(leadId ?? undefined);
  const { data: interactions } = useInteractions(leadId ?? undefined);
  const createInteraction = useCreateInteraction();
  const { data: calendarEvents } = useCalendarEvents(leadId ?? undefined);
  const cancelEvent = useCancelCalendarEvent();
  const deleteLead = useDeleteLead();
  const { user } = useAuthStore();

  const [note, setNote] = useState("");
  const [type, setType] = useState("NOTA");
  const [tpChannel, setTpChannel] = useState("EMAIL");
  const [tpOutcome, setTpOutcome] = useState("");
  const [tpNotes, setTpNotes] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const { data: cadences } = useCadences();
  const enrollLead = useEnrollLead();
  const unenrollLead = useUnenrollLead();

  const activeEnrollment = lead?.cadence_enrollments?.find(e => e.status === "ACTIVE");
  const currentStep = activeEnrollment?.cadence?.steps?.find(s => s.step_order === activeEnrollment.current_step);

  function renderScript(template: string) {
    if (!lead) return template;
    try {
      return Handlebars.compile(template)({
        empresa: lead.company_name,
        contato: lead.contact_name || "Contato",
        nome_cliente: lead.contact_name || "Contato",
        nicho: lead.niche || "seu nicho",
        cidade: lead.city || "sua cidade",
        plataforma: lead.ecommerce_platform || "sua plataforma",
        sdr_nome: user?.name || "SDR",
        fit_tier: lead.fit_tier || "-",
      });
    } catch {
      return template;
    }
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleCreateInteraction = async () => {
    if (!leadId || !note.trim()) return;
    await createInteraction.mutateAsync({
      leadId,
      payload: { type, body: note },
    });
    setNote("");
  };

  const createTouchpoint = useCreateTouchpoint();

  const handleCreateTouchpoint = async () => {
    if (!leadId) return;
    await createTouchpoint.mutateAsync({
      leadId,
      payload: { channel: tpChannel, outcome: tpOutcome || null, notes: tpNotes || null },
    });
    setTpNotes("");
    setTpOutcome("");
  };
  
  const handleDeleteLead = async () => {
    if (!leadId) return;
    if (window.confirm("Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.")) {
      await deleteLead.mutateAsync(leadId);
      onClose();
    }
  };

  const sidebarContent = (
    <>
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground font-medium">Carregando detalhes...</p>
          </div>
        )}

        {!isLoading && !lead && leadId && (
          <div className="flex flex-col items-center justify-center h-full py-20 px-10 text-center">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold text-foreground">Lead não encontrado</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Não conseguimos carregar as informações deste lead.
            </p>
            <Button variant="outline" className="mt-6" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}

        {lead && (
          <>
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                    {lead.status.replace(/_/g, " ")}
                  </Badge>
                  {lead.bloqueio_status === "ALERTA" && (
                    <Badge variant="destructive" className="animate-pulse text-[10px]">ALERTA</Badge>
                  )}
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver página
                </Link>
                {(user?.role === "MANAGER" || user?.role === "OWNER") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 text-[10px] uppercase font-bold"
                    onClick={handleDeleteLead}
                    disabled={deleteLead.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir
                  </Button>
                )}
              </div>
              {isMobile ? (
                <Drawer.Title className="text-xl font-bold text-foreground">
                  {lead.company_name}
                </Drawer.Title>
              ) : (
                <SheetTitle className="text-xl font-bold text-foreground">
                  {lead.company_name}
                </SheetTitle>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{lead.niche}</span>
                {lead.city && <span>• {lead.city}, {lead.state}</span>}
              </div>
            </div>

            {/* Injeção do bloco de revisão de IA (Lead HIL) */}
            <AiSuggestionReview leadId={lead.id} metadata={(lead as any).ai_metadata} />

            {/* Tier A stale insight + channel suggestion */}
            {(() => {
              const tierInsight = getTierAInsight(lead.fit_tier, lead.updated_at);
              const channelSuggestion = interactions ? getNextChannelSuggestion(interactions) : null;
              if (!tierInsight && !channelSuggestion) return null;
              return (
                <div className="px-6 pt-4 space-y-2">
                  {tierInsight && <InsightBanner insight={tierInsight} />}
                  {channelSuggestion && (
                    <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-accent">Próximo canal recomendado:</span>
                      <span className="text-xs font-bold text-foreground">{channelSuggestion}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <Tabs key={lead?.id} defaultValue={activeEnrollment ? "script" : "perfil"} className="mt-4">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="perfil">Perfil</TabsTrigger>
                  <TabsTrigger value="script">
                    <div className="flex items-center gap-1.5">
                      <ListChecks className="h-3 w-3" />
                      Script
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                  <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="script" className="space-y-5 pt-4 px-6 pb-10">
                {!activeEnrollment ? (
                  <div className="space-y-4 py-4">
                    <div className="rounded-lg border border-border bg-surface-raised p-4 text-center space-y-3">
                      <Target className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Sem cadência ativa</h4>
                        <p className="text-xs text-muted-foreground mt-1">Este lead não está em nenhuma sequência de prospecção.</p>
                      </div>
                      
                      <div className="pt-2 text-left">
                        <label className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5 block">Selecionar Cadência</label>
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                            onChange={(e) => {
                              const cid = e.target.value;
                              if (cid && leadId) {
                                enrollLead.mutate({ cadenceId: cid, leadId });
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Escolha uma cadência...</option>
                            {cadences?.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Step Info */}
                    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[10px] text-accent uppercase font-bold tracking-wider">Cadência Ativa</p>
                          <h4 className="text-sm font-bold text-foreground">{activeEnrollment.cadence?.name}</h4>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => unenrollLead.mutate({ cadenceId: activeEnrollment.cadence_id, leadId: lead.id })}
                        >
                          <StopCircle className="h-3 w-3 mr-1" /> Parar
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2 pt-2 border-t border-accent/10">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-accent">Passo {activeEnrollment.current_step}</span>
                          {currentStep && <span>• {currentStep.channel}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Script "Cola" */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <PlayCircle className="h-3.5 w-3.5 text-accent" /> Script de Prospecção
                      </h4>
                      
                      {!currentStep?.template ? (
                        <div className="rounded-xl border border-border p-8 text-center bg-surface-raised">
                          <p className="text-sm text-muted-foreground italic">Nenhum template vinculado a este passo.</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border bg-surface overflow-hidden">
                          <div className="bg-surface-raised px-4 py-2 border-b border-border flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{currentStep.template.name}</span>
                            <Badge variant="outline" className="text-[9px] uppercase">{currentStep.channel}</Badge>
                          </div>
                          
                          <div className="p-4 bg-surface text-sm text-foreground space-y-4">
                            {currentStep.channel === "LIGACAO" ? (
                              (() => {
                                try {
                                  const json = JSON.parse(currentStep.template.body);
                                  return (
                                    <div className="space-y-4">
                                      {json.abertura && (
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-accent uppercase">1. Abertura</p>
                                          <div className="p-3 bg-accent/5 rounded-lg border border-accent/10 whitespace-pre-wrap leading-relaxed">
                                            {renderScript(json.abertura)}
                                          </div>
                                        </div>
                                      )}
                                      {json.diagnostico && (
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-blue-500 uppercase">2. Diagnóstico</p>
                                          <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 whitespace-pre-wrap leading-relaxed">
                                            {renderScript(json.diagnostico)}
                                          </div>
                                        </div>
                                      )}
                                      {json.implicacao && (
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-purple-500 uppercase">3. Implicação</p>
                                          <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10 whitespace-pre-wrap leading-relaxed">
                                            {renderScript(json.implicacao)}
                                          </div>
                                        </div>
                                      )}
                                      {json.convite && (
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-emerald-500 uppercase">4. Convite</p>
                                          <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10 whitespace-pre-wrap leading-relaxed">
                                            {renderScript(json.convite)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                } catch {
                                  return <div className="whitespace-pre-wrap leading-relaxed">{renderScript(currentStep.template.body)}</div>;
                                }
                              })()
                            ) : (
                              <div className="whitespace-pre-wrap leading-relaxed">
                                {renderScript(currentStep.template.body)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="perfil" className="space-y-5 pt-4 px-6 pb-10">
                {/* Score Badges */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 rounded-lg bg-surface-raised border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Score Potencial</span>
                    <span className="text-xl font-bold text-foreground">{lead.operational_score != null ? Math.round(lead.operational_score) : "—"}</span>
                    <PotentialScoreBadge tier={lead.fit_tier} score={lead.operational_score} />
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-surface-raised border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">ICP Score</span>
                    <span className="text-xl font-bold text-foreground">{lead.icp_score}/14</span>
                    <ICPBadge score={lead.icp_score} />
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-surface-raised border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Plataforma</span>
                    <span className="text-sm font-bold text-foreground truncate w-full text-center">
                      {lead.ecommerce_platform ?? "N/A"}
                    </span>
                    <IntegrabilityBadge level={lead.integrability} />
                  </div>
                </div>

                {/* Decision Maker Section */}
                <div className="space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" /> Decisor / Contato Ideal
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField openOnMount label="Nome" value={lead.contact_name} field="contact_name" leadId={lead.id} placeholder="Quem é o decisor?" />
                    <EditableField label="Cargo" value={lead.contact_role} field="contact_role" leadId={lead.id} placeholder="Ex: Head de E-commerce" />
                    <EditableField label="Email" value={lead.email} field="email" leadId={lead.id} type="email" placeholder="email@empresa.com" />
                    <EditableField label="WhatsApp" value={lead.whatsapp} field="whatsapp" leadId={lead.id} type="tel" placeholder="(11) 99999-9999" />
                    <EditableField label="LinkedIn" value={lead.linkedin_url} field="linkedin_url" leadId={lead.id} placeholder="linkedin.com/in/..." />
                    <EditableField label="Telefone" value={lead.phone} field="phone" leadId={lead.id} type="tel" placeholder="(11) 3333-3333" />
                  </div>
                </div>

                {/* Company Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Informações da Empresa</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="CNPJ" value={lead.cnpj} field="cnpj" leadId={lead.id} placeholder="Não informado" />
                    <EditableField label="Website" value={lead.website_url} field="website_url" leadId={lead.id} placeholder="www.empresa.com" />
                    <EditableField label="Instagram" value={lead.instagram_handle} field="instagram_handle" leadId={lead.id} placeholder="@empresa" />
                    <EditableField label="Nicho" value={lead.niche} field="niche" leadId={lead.id} />
                  </div>
                  <div className="pt-1">
                    <ChannelIcons
                      whatsapp={lead.whatsapp}
                      email={lead.email}
                      instagram={lead.instagram_handle}
                      linkedin={lead.linkedin_url}
                    />
                  </div>
                </div>

                {/* Commercial Diagnosis */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Diagnóstico Comercial</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center p-3 rounded-lg border border-border">
                       <div>
                         <p className="text-[10px] text-muted-foreground uppercase">Base Estimada</p>
                         <p className="font-bold text-foreground">{lead.estimated_base_size?.toLocaleString('pt-BR') ?? "—"} contatos</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] text-muted-foreground uppercase">Ticket Médio</p>
                         <p className="font-bold text-foreground">R$ {lead.avg_ticket_estimated?.toLocaleString('pt-BR') ?? "—"}</p>
                       </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Ciclo de Recompra</p>
                      <p className="font-bold text-foreground">{lead.prr_inputs?.recompra_cycle_days ? `${lead.prr_inputs.recompra_cycle_days} dias` : "Não informado"}</p>
                    </div>
                  </div>
                  {/* PRR calculation button removed */}
                </div>
              </TabsContent>

              <TabsContent value="tarefas" className="pt-4 space-y-4 px-6 pb-10">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Próximas Tarefas</h4>
                  {!lead.tasks || lead.tasks.length === 0 ? (
                    <p className="text-center py-8 text-sm text-muted-foreground italic">Nenhuma tarefa pendente</p>
                  ) : (
                    lead.tasks.map((task) => (
                      <div key={task.id} className="p-3 rounded-lg border border-border bg-surface-raised flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-foreground">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] uppercase">{task.channel ?? 'Geral'}</Badge>
                            {task.scheduled_at && (
                              <span className="text-[10px] text-muted-foreground">
                                Scheduled: {format(new Date(task.scheduled_at), "dd MMM, HH:mm", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[9px]">{task.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="historico" className="pt-4 space-y-4 px-6 pb-10">
                {/* Register Interaction */}
                <div className="p-4 rounded-lg bg-surface-raised border border-border space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase">Registrar Interação</h4>
                  <div className="flex gap-2">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="text-xs border border-border rounded px-2 py-1.5 bg-surface text-foreground"
                    >
                      <option value="NOTA">Nota</option>
                      <option value="EMAIL">Email</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="LIGACAO">Ligação</option>
                      <option value="REUNIAO">Reunião</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Descreva a interação..."
                      className="flex-1 text-xs border border-border rounded px-2 py-1.5 bg-surface text-foreground placeholder:text-muted-foreground"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateInteraction()}
                    />
                    <Button size="sm" onClick={handleCreateInteraction} disabled={createInteraction.isPending}>
                      Salvar
                    </Button>
                  </div>
                </div>

                {/* Register Touchpoint */}
                <div className="p-4 rounded-lg bg-surface-raised border border-border space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase">Registrar Touchpoint</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex gap-2">
                      <select
                        value={tpChannel}
                        onChange={(e) => setTpChannel(e.target.value)}
                        className="text-xs border border-border rounded px-2 py-1.5 bg-surface text-foreground"
                      >
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="LIGACAO">Ligação</option>
                        <option value="LINKEDIN">LinkedIn</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Outcome (ex: interested)"
                        className="flex-1 text-xs border border-border rounded px-2 py-1.5 bg-surface text-foreground placeholder:text-muted-foreground"
                        value={tpOutcome}
                        onChange={(e) => setTpOutcome(e.target.value)}
                      />
                    </div>
                    <textarea
                      placeholder="Notas sobre o touchpoint..."
                      className="w-full text-xs border border-border rounded px-2 py-1.5 bg-surface text-foreground placeholder:text-muted-foreground"
                      value={tpNotes}
                      onChange={(e) => setTpNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleCreateTouchpoint} disabled={createTouchpoint.isPending}>
                        {createTouchpoint.isPending ? "Salvando..." : "Salvar Touchpoint"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Touchpoints</h4>
                    {lead?.id && <TouchpointTimeline leadId={lead.id} />}
                  </div>
                  {interactions?.length === 0 ? (
                    <p className="text-center py-8 text-sm text-muted-foreground italic">Nenhuma interação registrada ainda</p>
                  ) : (
                    interactions?.map((inter) => {
                      const config = INTERACTION_ICONS[inter.type] ?? INTERACTION_ICONS.NOTA;
                      const Icon = config.icon;
                      return (
                        <div key={inter.id} className="relative pl-8 border-l-2 border-border pb-4 last:pb-0">
                          <div className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border ${config.color}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">{inter.type}</span>
                              {inter.source === "CADENCIA" && (
                                <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">Auto</span>
                              )}
                              {inter.status && inter.type === "EMAIL" && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                  inter.status === "clicked" ? "bg-purple-500/10 text-purple-500" :
                                  inter.status === "opened" ? "bg-green-500/10 text-green-500" :
                                  inter.status === "delivered" ? "bg-blue-500/10 text-blue-500" :
                                  inter.status === "bounced" ? "bg-red-500/10 text-red-500" :
                                  "bg-gray-500/10 text-gray-500"
                                }`}>
                                  {inter.status}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(inter.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {inter.subject && (
                            <p className="text-xs font-medium text-foreground/80 mb-0.5">{inter.subject}</p>
                          )}
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inter.body}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reunioes" className="pt-4 space-y-3 px-6 pb-10">
                {!calendarEvents || calendarEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma reunião agendada
                    </p>
                  </div>
                ) : (
                  calendarEvents.map((evt) => {
                    const isCancelled = evt.status === "cancelled";
                    return (
                      <div
                        key={evt.id}
                        className={`rounded-lg border p-4 space-y-2 ${
                          isCancelled
                            ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 opacity-60"
                            : "border-border bg-surface-raised"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isCancelled ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {evt.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(evt.inicio), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                              {" — "}
                              {format(new Date(evt.fim), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {!isCancelled && (
                            <button
                              onClick={() => cancelEvent.mutate(evt.id)}
                              disabled={cancelEvent.isPending}
                              className="text-red-400 hover:text-red-500 p-1 shrink-0"
                              title="Cancelar reunião"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {evt.meet_link && !isCancelled && (
                          <a
                            href={evt.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                          >
                            <Video className="h-3 w-3" />
                            Abrir Google Meet
                          </a>
                        )}

                        {evt.convidados.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Convidados: {evt.convidados.join(", ")}
                          </p>
                        )}

                        {isCancelled && (
                          <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer.Root open={!!leadId} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] rounded-t-2xl bg-surface border-t border-border overflow-hidden flex flex-col">
            <div className="mx-auto mt-3 mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />
            <div className="flex-1 overflow-y-auto pb-safe">
              {sidebarContent}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[100vw] sm:w-[600px] sm:max-w-[600px] lg:sm:w-[700px] lg:sm:max-w-[700px] overflow-y-auto p-0 border-l border-border shadow-2xl transition-all duration-300">
        {sidebarContent}
      </SheetContent>
    </Sheet>
  );
}
