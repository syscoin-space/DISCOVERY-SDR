"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLead, useInteractions, useCreateInteraction, useUpdateLead, useLeadStack, useAddToStack, useRemoveFromStack } from "@/hooks/use-leads";
import { EditableLeadField } from "@/components/lead/EditableLeadField";
import { PotentialScoreBadge } from "@/components/shared/PotentialScoreBadge";
import { ICPBadge } from "@/components/shared/ICPBadge";
import { IntegrabilityBadge } from "@/components/shared/IntegrabilityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  MessageCircle,
  ExternalLink,
  Pencil,
  Check,
  X,
  Globe,
  Building2,
  MapPin,
  User,
  Send,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import type { Lead } from "@/lib/types";

// ─── Inline Editable Field (Removed, using EditableLeadField) ──────────────────────────────────────────

// ─── Contact action button ──────────────────────────────────────────

function ContactButton({ href, icon: Icon, label, color }: { href: string; icon: typeof Mail; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-transparent ${color}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

// ─── Timeline icons ─────────────────────────────────────────────────

const TIMELINE_CONFIG: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
  EMAIL: { icon: Mail, color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-500", bg: "bg-green-500/10 border-green-500/30" },
  LIGACAO: { icon: Phone, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  LINKEDIN: { icon: Linkedin, color: "text-blue-700", bg: "bg-blue-700/10 border-blue-700/30" },
  REUNIAO: { icon: ExternalLink, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30" },
  NOTA: { icon: Pencil, color: "text-gray-500", bg: "bg-gray-500/10 border-gray-500/30" },
};

// ─── Main Page ──────────────────────────────────────────────────────

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: lead, isLoading } = useLead(id);
  const { data: interactions } = useInteractions(id);
  const { data: stack } = useLeadStack(id);
  const createInteraction = useCreateInteraction();
  const addToStack = useAddToStack();
  const removeFromStack = useRemoveFromStack();

  const [note, setNote] = useState("");
  const [interType, setInterType] = useState("NOTA");
  const [showAddStack, setShowAddStack] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newTool, setNewTool] = useState("");

  const handleCreate = async () => {
    if (!note.trim()) return;
    try {
      await createInteraction.mutateAsync({ leadId: id, payload: { type: interType, body: note } });
      setNote("");
    } catch (err) {
      console.error("Erro ao registrar interação:", err);
      alert("Erro ao registrar interação. Por favor, tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lead não encontrado</p>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border bg-surface px-6 py-4">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-foreground">{lead.company_name}</h1>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
              {lead.status.replace(/_/g, " ")}
            </Badge>
            {lead.bloqueio_status === "ALERTA" && (
              <Badge variant="destructive" className="animate-pulse text-[10px]">ALERTA</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {lead.niche}{lead.city ? ` • ${lead.city}, ${lead.state}` : ""}
          </p>
        </div>
      </div>

      {/* Content: 2 columns */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">

          {/* LEFT: Profile (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Score Cards */}
            <div className="grid grid-cols-3 gap-4">
              <ScoreCard label="Score Potencial" value={lead.operational_score != null ? Math.round(lead.operational_score) : "—"}>
                <PotentialScoreBadge tier={lead.fit_tier} score={lead.operational_score} />
              </ScoreCard>
              <ScoreCard label="ICP Score" value={lead.icp_score ?? "—"}>
                <ICPBadge score={lead.icp_score} />
              </ScoreCard>
              <ScoreCard label="Plataforma" value={lead.ecommerce_platform ?? "N/A"}>
                <IntegrabilityBadge level={lead.integrability} />
              </ScoreCard>
            </div>

            {/* Decision Maker */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Decisor / Contato Ideal</h3>
                  <p className="text-[10px] text-muted-foreground">Pessoa que precisa participar da reunião</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <EditableLeadField label="Nome" value={lead.contact_name} field="contact_name" leadId={id} placeholder="Quem é o decisor?" />
                <EditableLeadField label="Cargo" value={lead.contact_role} field="contact_role" leadId={id} placeholder="Ex: Head de Marketing" />
                <EditableLeadField label="Email" value={lead.email} field="email" leadId={id} type="email" placeholder="email@empresa.com" />
                <EditableLeadField label="WhatsApp" value={lead.whatsapp} field="whatsapp" leadId={id} type="tel" placeholder="(11) 99999-9999" />
                <EditableLeadField label="Telefone" value={lead.phone} field="phone" leadId={id} type="tel" placeholder="(11) 3333-3333" />
                <EditableLeadField label="LinkedIn" value={lead.linkedin_url} field="linkedin_url" leadId={id} placeholder="linkedin.com/in/..." />
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {lead.email && (
                  <ContactButton href={`mailto:${lead.email}`} icon={Mail} label="Email" color="hover:bg-accent/10 hover:text-accent" />
                )}
                {lead.whatsapp && (
                  <ContactButton href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`} icon={MessageCircle} label="WhatsApp" color="hover:bg-green-500/10 hover:text-green-600" />
                )}
                {lead.linkedin_url && (
                  <ContactButton href={lead.linkedin_url} icon={Linkedin} label="LinkedIn" color="hover:bg-blue-700/10 hover:text-blue-700" />
                )}
                {lead.phone && (
                  <ContactButton href={`tel:${lead.phone}`} icon={Phone} label="Ligar" color="hover:bg-amber-500/10 hover:text-amber-600" />
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Informações da Empresa</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <EditableLeadField label="CNPJ" value={lead.cnpj} field="cnpj" leadId={id} />
                <EditableLeadField label="Website" value={lead.website_url} field="website_url" leadId={id} />
                <EditableLeadField label="Instagram" value={lead.instagram_handle} field="instagram_handle" leadId={id} placeholder="@empresa" />
                <EditableLeadField label="Nicho" value={lead.niche} field="niche" leadId={id} />
                <EditableLeadField label="Cidade" value={lead.city} field="city" leadId={id} />
                <EditableLeadField label="Estado" value={lead.state} field="state" leadId={id} />
              </div>
              {lead.website_url && (
                <a href={lead.website_url.startsWith("http") ? lead.website_url : `https://${lead.website_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                  <Globe className="h-3 w-3" /> Abrir website
                </a>
              )}
            </div>

            {/* Discovered Stack / Plataformas */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Stack / Plataformas</h3>
                    <p className="text-[10px] text-muted-foreground">Ferramentas e plataformas utilizadas pelo lead</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddStack(!showAddStack)}
                  className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar
                </button>
              </div>

              {/* Add form */}
              {showAddStack && (
                <div className="flex items-end gap-2 p-3 rounded-lg bg-surface-raised border border-border">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Categoria</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full mt-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
                    >
                      <option value="">Selecione...</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="CRM">CRM</option>
                      <option value="Email Marketing">Email Marketing</option>
                      <option value="ERP">ERP</option>
                      <option value="Pagamento">Pagamento</option>
                      <option value="Logística">Logística</option>
                      <option value="Analytics">Analytics</option>
                      <option value="Atendimento">Atendimento</option>
                      <option value="Automação">Automação</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Ferramenta</label>
                    <input
                      type="text"
                      value={newTool}
                      onChange={(e) => setNewTool(e.target.value)}
                      placeholder="Ex: Shopify, RD Station..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCategory && newTool.trim()) {
                          addToStack.mutate({ leadId: id, category: newCategory, tool_name: newTool.trim() });
                          setNewTool("");
                        }
                      }}
                      className="w-full mt-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newCategory || !newTool.trim()) return;
                      addToStack.mutate({ leadId: id, category: newCategory, tool_name: newTool.trim() });
                      setNewTool("");
                    }}
                    disabled={!newCategory || !newTool.trim() || addToStack.isPending}
                    className="bg-accent hover:bg-accent-hover"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Stack items grouped by category */}
              {!stack?.length ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Nenhuma plataforma mapeada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(
                    stack.reduce<Record<string, typeof stack>>((acc, item) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    }, {})
                  ).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <span
                            key={item.id}
                            className="group flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {item.tool_name}
                            <button
                              onClick={() => removeFromStack.mutate({ leadId: id, stackId: item.id })}
                              className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commercial Diagnosis */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Diagnóstico Comercial
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-surface-raised border border-border text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Base Estimada</p>
                  <p className="text-lg font-bold text-foreground">{lead.estimated_base_size?.toLocaleString('pt-BR') ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">contatos</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised border border-border text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Ticket Médio</p>
                  <p className="text-lg font-bold text-foreground">R$ {lead.avg_ticket_estimated?.toLocaleString('pt-BR') ?? "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised border border-border text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Ciclo Recompra</p>
                  <p className="text-lg font-bold text-foreground">{lead.prr_inputs?.recompra_cycle_days ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">dias</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Timeline (1/3) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Timeline</h3>

            {/* New interaction */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <select
                value={interType}
                onChange={(e) => setInterType(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-surface text-foreground"
              >
                <option value="NOTA">Nota</option>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="LIGACAO">Ligação</option>
                <option value="REUNIAO">Reunião</option>
                <option value="LINKEDIN">LinkedIn</option>
              </select>
              <textarea
                placeholder="Descreva a interação..."
                rows={3}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                className="w-full bg-accent hover:bg-accent-hover"
                size="sm"
                onClick={handleCreate}
                disabled={createInteraction.isPending || !note.trim()}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {createInteraction.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </div>

            {/* Timeline items */}
            <div className="space-y-0">
              {!interactions?.length ? (
                <p className="text-center py-8 text-sm text-muted-foreground italic">
                  Nenhuma interação registrada
                </p>
              ) : (
                interactions.map((inter, i) => {
                  const cfg = TIMELINE_CONFIG[inter.type] ?? TIMELINE_CONFIG.NOTA;
                  const Icon = cfg.icon;
                  const isLast = i === interactions.length - 1;

                  return (
                    <div key={inter.id} className="relative flex gap-3">
                      {/* Vertical line */}
                      {!isLast && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}

                      {/* Icon */}
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">{inter.type}</span>
                            {inter.source === "CADENCIA" && (
                              <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">Auto</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(inter.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {inter.subject && (
                          <p className="text-xs font-medium text-foreground/80 mb-0.5">{inter.subject}</p>
                        )}
                        {inter.body && (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{inter.body}</p>
                        )}

                        {/* Sub-Eventos de E-mail (Tracking) */}
                        {inter.type === "EMAIL" && inter.email_events && inter.email_events.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {inter.email_events.map((evt: any) => (
                              <div 
                                key={evt.id} 
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                                  evt.type.includes('click') ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                  evt.type.includes('open') ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                  evt.type.includes('deliver') ? "bg-accent/10 text-accent border-accent/20" :
                                  evt.type.includes('bounce') ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                  "bg-muted/10 text-muted-foreground border-border"
                                }`}
                                title={format(new Date(evt.created_at), "dd/MM HH:mm:ss")}
                              >
                                {evt.type.includes('click') && <ExternalLink className="h-2.5 w-2.5" />}
                                {evt.type.includes('open') && <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />}
                                {evt.type.includes('deliver') && <Check className="h-2.5 w-2.5" />}
                                {evt.type.replace('email.', '').toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Score Card ──────────────────────────────────────────────────────

function ScoreCard({ label, value, children }: { label: string; value: string | number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-surface border border-border">
      <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{label}</span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      {children}
    </div>
  );
}
