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
import { LeadHistoryTimeline } from "@/components/lead/LeadHistoryTimeline";
import { EditableLeadField } from "@/components/lead/EditableLeadField";
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
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLink, Pencil, Check, X, Mail, Phone, Linkedin, MessageCircle, Calendar, Video, XCircle, Search, UserRound, Target, Trash2, ListChecks, PlayCircle, StopCircle, Clock } from "lucide-react";
import { getTierAInsight, getNextChannelSuggestion } from "@/lib/insights";
import { InsightBanner } from "@/components/shared/InsightToast";
import { useCalendarEvents, useCancelCalendarEvent } from "@/hooks/use-google";
import { useTodayTasks, useUpdateTask } from "@/hooks/use-today";
import { useCadences, useEnrollLead, useUnenrollLead } from "@/hooks/use-cadences";
import Handlebars from "handlebars";

interface LeadSidebarProps {
  leadId: string | null;
  onClose: () => void;
}

// ─── Inline Editable Field (Removed, using EditableLeadField) ──────────────────────────────────────────

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
  const [tpOutcome, setTpOutcome] = useState("RESPONDED");
  const [tpNotes, setTpNotes] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [taskOutcome, setTaskOutcome] = useState("");
  const updateTask = useUpdateTask();

  const { data: cadences } = useCadences();
  const enrollLead = useEnrollLead();
  const unenrollLead = useUnenrollLead();

  const activeEnrollment = lead?.cadence_enrollments?.find(e => e.status === "ACTIVE");
  const priorityTask = lead?.tasks?.find(t => (t.status === "PENDENTE" || t.status === "EM_ANDAMENTO") && t.cadence_step_id);
  const currentStep = activeEnrollment?.cadence?.steps?.find(s => s.step_order === activeEnrollment.current_step);
  const hasActiveCadenceTask = !!priorityTask;

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
    try {
      await createInteraction.mutateAsync({
        leadId,
        payload: { type, body: note },
      });
      setNote("");
    } catch (err) {
      console.error("Erro ao registrar interação:", err);
      alert("Erro ao registrar interação. Por favor, tente novamente.");
    }
  };

  const createTouchpoint = useCreateTouchpoint();

  const handleCreateTouchpoint = async () => {
    if (!leadId) return;
    try {
      await createTouchpoint.mutateAsync({
        leadId,
        payload: { 
          channel: tpChannel, 
          outcome: tpOutcome, 
          notes: tpNotes || null,
          touchpoint_type: "MANUAL"
        },
      });
      setTpNotes("");
      setTpOutcome("");
    } catch (err) {
      console.error("Erro ao registrar touchpoint:", err);
      alert("Erro ao registrar touchpoint. Por favor, tente novamente.");
    }
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
              <div className="flex items-center justify-between mb-4">
                {/* Actions Group (Loosely grouped on the left, far from the close button) */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/leads/${lead.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "h-7 gap-1.5 text-[10px] uppercase font-bold border-accent/20 text-accent hover:bg-accent hover:text-white transition-all shadow-sm"
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver Página
                  </Link>

                  {(user?.role === "MANAGER" || user?.role === "OWNER") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-[10px] uppercase font-bold text-destructive hover:bg-destructive hover:text-white border-destructive/20 transition-all shadow-sm"
                      onClick={handleDeleteLead}
                      disabled={deleteLead.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  )}
                </div>

                {/* Status Badges (Further from the buttons, closer to the right but before the X) */}
                <div className="flex items-center gap-2 pr-6">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-1 border-muted-foreground/20 text-muted-foreground">
                    {lead.status.replace(/_/g, " ")}
                  </Badge>
                  {lead.bloqueio_status === "ALERTA" && (
                    <Badge variant="destructive" className="animate-pulse text-[10px]">ALERTA</Badge>
                  )}
                </div>
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
              const channelSuggestion = interactions?.items ? getNextChannelSuggestion(interactions.items) : null;
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

            <Tabs key={lead?.id} defaultValue={activeEnrollment && hasActiveCadenceTask ? "script" : "perfil"} className="mt-4">
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
                        <PlayCircle className="h-3.5 w-3.5 text-accent" /> Script Operacional (Passo Atual)
                      </h4>
                      
                      {!currentStep?.template ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center bg-surface-raised/50">
                          <p className="text-sm text-muted-foreground font-medium uppercase tracking-tight">Este passo não possui template vinculado.</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Configure um template no menu de Cadências para habilitar a cola operacional.</p>
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

                      {/* Proximos passos da cadencia (Transparentes) */}
                      {activeEnrollment?.cadence?.steps && (
                        <div className="mt-8 space-y-3 px-6 pb-10">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Clock className="h-3 w-3" /> Próximos Passos
                          </h4>
                          <div className="space-y-4">
                            {activeEnrollment.cadence.steps
                              .filter((s: any) => s.step_order > activeEnrollment.current_step)
                              .slice(0, 3)
                              .map((step: any) => (
                                <div key={step.id} className="opacity-40 group hover:opacity-100 transition-opacity">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-muted-foreground">Passo {step.step_order} &mdash; D+{step.day_offset}</span>
                                    <Badge variant="outline" className="text-[8px] h-4 uppercase">{step.channel}</Badge>
                                  </div>
                                  <div className="p-3 bg-surface-raised border border-border rounded-lg text-xs text-muted-foreground italic">
                                    {step.template?.name || "Sem template"} &bull; {step.instructions || "Sem instruções"}
                                  </div>
                                </div>
                              ))}
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
                    <PotentialScoreBadge tier={lead.fit_tier} score={lead.operational_score} />
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-surface-raised border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">ICP Score</span>
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
                    <EditableLeadField openOnMount label="Nome" value={lead.contact_name} field="contact_name" leadId={lead.id} placeholder="Quem é o decisor?" />
                    <EditableLeadField label="Cargo" value={lead.contact_role} field="contact_role" leadId={lead.id} placeholder="Ex: Head de E-commerce" />
                    <EditableLeadField label="Email" value={lead.email} field="email" leadId={lead.id} type="email" placeholder="email@empresa.com" />
                    <EditableLeadField label="WhatsApp" value={lead.whatsapp} field="whatsapp" leadId={lead.id} type="tel" placeholder="(11) 99999-9999" />
                    <EditableLeadField label="LinkedIn" value={lead.linkedin_url} field="linkedin_url" leadId={lead.id} placeholder="linkedin.com/in/..." />
                    <EditableLeadField label="Telefone" value={lead.phone} field="phone" leadId={lead.id} type="tel" placeholder="(11) 3333-3333" />
                  </div>
                </div>

                {/* Company Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Informações da Empresa</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <EditableLeadField label="CNPJ" value={lead.cnpj} field="cnpj" leadId={lead.id} placeholder="Não informado" />
                    <EditableLeadField label="Website" value={lead.website_url} field="website_url" leadId={lead.id} placeholder="www.empresa.com" />
                    <EditableLeadField label="Instagram" value={lead.instagram_handle} field="instagram_handle" leadId={lead.id} placeholder="@empresa" />
                    <EditableLeadField label="Nicho" value={lead.niche} field="niche" leadId={lead.id} />
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
                    <div className="space-y-3">
                      {lead.tasks
                        .filter(t => t.status === "PENDENTE" || t.status === "EM_ANDAMENTO")
                        .map((task) => (
                          <div key={task.id} className="p-4 rounded-xl border border-border bg-surface-raised shadow-sm transition-all hover:border-accent/40">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{task.title}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold border-accent/20 text-accent bg-accent/5">
                                    {task.channel ?? 'Geral'}
                                  </Badge>
                                  {task.scheduled_at && (
                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Agendado: {format(new Date(task.scheduled_at), "dd MMM, HH:mm", { locale: ptBR })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {completingTaskId !== task.id ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-[10px] font-bold uppercase border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                  onClick={() => setCompletingTaskId(task.id)}
                                >
                                  Concluir
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] animate-pulse">Preenchendo...</Badge>
                              )}
                            </div>

                            {completingTaskId === task.id && (
                              <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Script Preview inside Task completion (Cola Operacional Imediata) */}
                                {(task as any).cadence_step?.template && (
                                  <div className="rounded-lg border border-accent/20 bg-accent/5 overflow-hidden">
                                     <div className="bg-accent/10 px-3 py-1.5 border-b border-accent/10 flex items-center justify-between">
                                       <span className="text-[9px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                                          <PlayCircle className="h-3 w-3" /> Cola Operacional
                                       </span>
                                       <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-accent/20 text-accent">Script Ativo</Badge>
                                     </div>
                                     <div className="p-3 text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar italic bg-accent/[0.02]">
                                       {(() => {
                                          const template = (task as any).cadence_step.template;
                                          if (task.channel === "LIGACAO") {
                                            try {
                                              const json = JSON.parse(template.body);
                                              return json.abertura || template.body;
                                            } catch {
                                              return renderScript(template.body);
                                            }
                                          }
                                          return renderScript(template.body);
                                       })()}
                                     </div>
                                  </div>
                                )}

                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">O que aconteceu?</label>
                                  <textarea
                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none resize-none min-h-[60px]"
                                    placeholder="Ex: Cliente atendeu e pediu retorno amanhã..."
                                    value={taskOutcome}
                                    onChange={(e) => setTaskOutcome(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 text-[10px] font-bold text-muted-foreground"
                                    onClick={() => { setCompletingTaskId(null); setTaskOutcome(""); }}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="h-8 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 shadow-lg"
                                    disabled={updateTask.isPending}
                                    onClick={async () => {
                                      try {
                                        await updateTask.mutateAsync({
                                          id: task.id,
                                          status: "CONCLUIDA" as any,
                                          outcome: taskOutcome
                                        });
                                        setCompletingTaskId(null);
                                        setTaskOutcome("");
                                      } catch (err) {
                                        console.error("Erro ao concluir tarefa:", err);
                                        alert("Erro ao concluir tarefa. Por favor, tente novamente.");
                                      }
                                    }}
                                  >
                                    {updateTask.isPending ? "Salvando..." : "Salvar e Avançar"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
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
                      {createInteraction.isPending ? "Salvando..." : "Salvar"}
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
                      <select
                        value={tpOutcome}
                        onChange={(e) => setTpOutcome(e.target.value)}
                        className="flex-1 text-xs border border-border rounded px-2 py-1.5 bg-surface text-foreground"
                      >
                        <option value="RESPONDED">Respondeu</option>
                        <option value="NO_ANSWER">Não atendeu</option>
                        <option value="VOICEMAIL">Caixa postal</option>
                        <option value="SEEN_NO_REPLY">Viu e não respondeu</option>
                        <option value="SPOKE_DECISION_MAKER">Falou com decisor</option>
                        <option value="ASKED_FOLLOW_UP">Pediu retorno</option>
                        <option value="NOT_INTERESTED">Sem interesse</option>
                        <option value="BOOKED">Reunião agendada</option>
                        <option value="LOST">Perdido</option>
                      </select>
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
                <div className="space-y-6">
                  {/* Lead Movement History */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Movimentações do Funil</h4>
                    {lead?.id && <LeadHistoryTimeline leadId={lead.id} />}
                  </div>

                  {/* Touchpoint Timeline */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Touchpoints</h4>
                    {lead?.id && <TouchpointTimeline leadId={lead.id} />}
                  </div>
                  
                  {/* Interactions */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Anotações e Envios</h4>
                  {interactions?.items?.length === 0 ? (
                    <p className="text-center py-8 text-sm text-muted-foreground italic">Nenhuma interação registrada ainda</p>
                  ) : (
                    interactions?.items?.map((inter) => {
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
      <SheetContent className="w-[100vw] lg:w-[33vw] lg:min-w-[520px] lg:max-w-[680px] overflow-y-auto p-0 border-l border-border shadow-2xl transition-all duration-300">
        {sidebarContent}
      </SheetContent>
    </Sheet>
  );
}
