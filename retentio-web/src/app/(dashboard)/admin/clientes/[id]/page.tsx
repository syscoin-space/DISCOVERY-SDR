"use client";

import { useAdminTenantDetails } from "@/hooks/use-admin-tenant";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Building2, 
  CreditCard, 
  Users, 
  Settings, 
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Zap,
  Globe,
  Palette
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminTenantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;

  const { data: profile, isLoading, error } = useAdminTenantDetails(tenantId);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold">Erro ao carregar cliente</h2>
        <p className="text-sm mt-2 opacity-80">Não foi possível localizar o perfil consolidado desta conta.</p>
        <button 
          onClick={() => router.back()}
          className="mt-6 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
        >
          Voltar para Clientes
        </button>
      </div>
    );
  }

  const { summary, billing, product, team, usage_health } = profile;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border bg-surface px-6 py-4">
        <button 
          onClick={() => router.push('/admin/clientes')}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            Visão 360º: {summary.name}
            {summary.status === "ACTIVE" ? (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-200">Ativa</span>
            ) : (
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-200">Inativa</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5 max-w-2xl truncate">
            ID: {summary.id} • Slug: {summary.slug}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {usage_health.operational_signal !== "NORMAL" && (
            <div className={`p-4 rounded-xl border ${
              usage_health.operational_signal === "BLOCKED_CHANNELS" 
                ? "bg-red-50 border-red-200 text-red-800" 
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Atenção: Sinal Operacional Crítico</h4>
                  <p className="text-xs mt-1">
                    {usage_health.operational_signal === "BLOCKED_CHANNELS" 
                      ? "O canal de e-mail deste cliente está bloqueado ou inválido, impedindo envios." 
                      : "A conta tem mais de 7 dias e ainda possui 0 leads, indicando falta de adoção da plataforma."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Bloco 1: Resumo Conta */}
            <div className="col-span-1 lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-4 border-b border-border/50 pb-3">
                <Building2 className="h-4 w-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Resumo da Conta</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Owner Principal</p>
                  <p className="text-sm font-medium mt-1">{summary.owner_name}</p>
                  <p className="text-xs text-muted-foreground">{summary.owner_email}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Plano & Onboarding</p>
                  <p className="text-sm font-medium mt-1">{summary.plan}</p>
                  <p className="text-xs text-muted-foreground capitalize">Status: {summary.onboarding_status.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Criada em</p>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(summary.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Billing */}
            <div className="col-span-1 border-t-4 border-blue-500 rounded-xl border-x border-b border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Assinatura</h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                  billing.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                  billing.status === 'TRIALING' ? 'bg-purple-100 text-purple-700' :
                  billing.status === 'CANCELED' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {billing.status}
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-end items-baseline gap-1">
                  <span className="text-2xl font-black">{billing.price}</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold">{billing.currency}/mês</span>
                </div>
                
                {billing.current_period_end && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-bold">Fim do Ciclo/Trial</p>
                    <p className="text-sm font-medium mt-0.5">
                      {format(new Date(billing.current_period_end), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                )}
                
                {(billing.gateway_customer_id || billing.gateway_subscription_id) && (
                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Gateway IDs</p>
                    {billing.gateway_customer_id && <p className="text-[10px] font-mono text-gray-500 truncate">Cust: {billing.gateway_customer_id}</p>}
                    {billing.gateway_subscription_id && <p className="text-[10px] font-mono text-gray-500 truncate">Sub: {billing.gateway_subscription_id}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 3: Produto / Configuração */}
            <div className="col-span-1 lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-4 border-b border-border/50 pb-3">
                <Settings className="h-4 w-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Configuração de Produto</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-gray-50/50 text-center">
                  <Globe className={`h-5 w-5 mb-2 ${product.discovery_enabled ? 'text-blue-500' : 'text-gray-400'}`} />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Discovery</p>
                  <p className={`text-xs mt-1 font-medium ${product.discovery_enabled ? 'text-blue-600' : 'text-gray-500'}`}>
                    {product.discovery_enabled ? 'Habilitado' : 'Desabilitado'}
                  </p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-gray-50/50 text-center">
                  <Palette className={`h-5 w-5 mb-2 ${product.branding_configured ? 'text-purple-500' : 'text-gray-400'}`} />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Branding</p>
                  <p className={`text-xs mt-1 font-medium ${product.branding_configured ? 'text-purple-600' : 'text-gray-500'}`}>
                    {product.branding_configured ? 'Customizado' : 'Default'}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-gray-50/50 text-center">
                  <Zap className={`h-5 w-5 mb-2 ${product.ai_configured ? 'text-amber-500' : 'text-gray-400'}`} />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Motores IA</p>
                  <p className={`text-xs mt-1 font-medium ${product.ai_configured ? 'text-amber-600' : 'text-gray-500'}`}>
                    {product.ai_configured ? 'Ativos' : 'Inativos'}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-gray-50/50 text-center">
                  <Mail className={`h-5 w-5 mb-2 ${
                    product.email_healthy ? 'text-green-500' : 
                    product.email_configured ? 'text-red-500' : 'text-gray-400'
                  }`} />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Canal E-mail</p>
                  <p className={`text-xs mt-1 font-medium ${
                    product.email_healthy ? 'text-green-600' : 
                    product.email_configured ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {product.email_healthy ? 'Saudável' : product.email_configured ? 'Falhando' : 'Não Config.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 4: Equipe */}
            <div className="col-span-1 md:col-span-1 lg:col-span-1 rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-4 border-b border-border/50 pb-3">
                <Users className="h-4 w-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Estrutura de Equipe</h3>
              </div>
              <div className="flex items-center gap-4 mb-5">
                <div className="h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <span className="text-xl font-black">{team.members_count}</span>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-foreground">Assentos Utilizados</p>
                  {team.pending_invites > 0 && (
                    <p className="text-xs text-amber-500 mt-0.5">{team.pending_invites} convites pendentes</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {Object.entries(team.roles_distribution).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-gray-50">
                    <span className="text-muted-foreground font-medium">{role}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco 5: Uso & Saúde Operacional (Alinhado) */}
            <div className="col-span-1 lg:col-span-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-4 border-b border-border/50 pb-3">
                <Activity className="h-4 w-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Uso e Operação Core</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-r border-border/50 pr-6">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold text-center">Volume Total de Leads</p>
                  <p className="text-4xl font-black text-center mt-3">{usage_health.total_leads}</p>
                </div>
                
                <div className="border-r border-border/50 px-2 flex flex-col justify-center items-center text-center">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold mb-2">Última Atividade Detectada</p>
                  {usage_health.last_activity_at ? (
                    <>
                      <p className="text-sm font-bold">{format(new Date(usage_health.last_activity_at), "dd/MM/yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(usage_health.last_activity_at), "HH:mm")}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sem eventos de uso.</p>
                  )}
                </div>

                <div className="pl-4">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold mb-3">Diagnóstico de E-mail</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                       {usage_health.email_health.status === 'HEALTHY' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                        usage_health.email_health.status === 'CRITICAL' ? <XCircle className="h-4 w-4 text-red-500" /> :
                        <AlertCircle className="h-4 w-4 text-amber-500" />}
                       <span className="font-bold">Status: {usage_health.email_health.status}</span>
                    </div>
                    {usage_health.email_health.issues.length > 0 ? (
                      <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-5">
                        {usage_health.email_health.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                       <p className="text-[10px] text-green-600 font-medium">Nenhuma falha de configuração detectada no painel.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
