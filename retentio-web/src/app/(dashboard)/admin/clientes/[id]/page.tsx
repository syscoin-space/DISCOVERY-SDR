"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  CreditCard,
  Users,
  Zap,
  Activity,
  Calendar,
  Clock,
  Mail,
  Shield,
  Palette,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import api from "@/lib/api/client";

// ─── Types ──────────────────────────────────────────────────────────

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  discovery_enabled: boolean;
  onboarding_status: string;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
  branding: any;
  plan: {
    name: string;
    key: string;
    price_monthly: number;
  } | null;
  subscription: {
    status: string;
    current_period_end: string | null;
    gateway_subscription_id: string | null;
  } | null;
  memberships: Array<{
    id: string;
    role: string;
    user: {
      name: string;
      email: string;
      avatar_url: string | null;
    };
  }>;
  ai_settings: {
    ai_enabled: boolean;
    default_provider: string;
  } | null;
  stats: {
    total_leads: number;
    total_cadences: number;
  };
}

// ─── Component ──────────────────────────────────────────────────────

export default function ClienteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenant = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/tenants/${id}`);
      setTenant(data);
    } catch (err) {
      console.error("[AdminClienteDetail] Erro ao carregar detalhe:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTenant(); }, [loadTenant]);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Cliente não encontrado</h2>
        <Button variant="link" onClick={() => router.push("/admin/clientes")}>Voltar para a lista</Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/clientes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </Button>
        <div className="flex gap-2">
          {!tenant.active && <Button variant="outline" size="sm">Ativar Conta</Button>}
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <ExternalLink className="h-4 w-4" />
            Entrar como Cliente
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4 items-center">
          <div className="h-16 w-16 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Globe className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{tenant.name}</h1>
              <Badge variant="outline" className={tenant.active ? "text-emerald-500 border-emerald-500/20" : "text-zinc-500"}>
                {tenant.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-sm font-mono text-muted-foreground mt-1">/{tenant.slug}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:flex gap-4">
          <StatBox label="Leads" value={tenant.stats.total_leads} icon={Activity} color="text-emerald-500" />
          <StatBox label="Cadências" value={tenant.stats.total_cadences} icon={Zap} color="text-blue-500" />
          <StatBox label="Equipe" value={tenant.memberships.length} icon={Users} color="text-violet-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Configuration */}
        <div className="lg:col-span-2 space-y-8">
          {/* Sessão: Plano & Assinatura */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Plano & Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem label="Plano Atual" value={tenant.plan?.name || "Sem plano"} />
              <DetailItem label="Status Assinatura" value={
                <Badge className={tenant.subscription?.status === 'ACTIVE' ? "bg-emerald-500" : "bg-zinc-500"}>
                  {tenant.subscription?.status || '—'}
                </Badge>
              } />
              <DetailItem label="Próximo Vencimento" value={tenant.subscription?.current_period_end ? new Date(tenant.subscription.current_period_end).toLocaleDateString() : '—'} />
              <DetailItem label="ID Gateway" value={tenant.subscription?.gateway_subscription_id || '—'} />
            </CardContent>
          </Card>

          {/* Sessão: Saúde & Setup */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Saúde & Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem 
                label="Onboarding" 
                value={tenant.onboarding_status === 'COMPLETED' ? "Concluído" : `Pendente (Passo ${tenant.onboarding_step})`} 
                icon={tenant.onboarding_status === 'COMPLETED' ? CheckCircle2 : Clock}
                iconColor={tenant.onboarding_status === 'COMPLETED' ? "text-emerald-500" : "text-amber-500"}
              />
              <DetailItem 
                label="Branding" 
                value={tenant.branding ? "Configurado" : "Pendente"} 
                icon={Palette}
                iconColor={tenant.branding ? "text-emerald-500" : "text-zinc-300"}
              />
              <DetailItem 
                label="Inteligência Artificial" 
                value={tenant.ai_settings?.ai_enabled ? "Ativa" : "Inativa"} 
                icon={Brain}
                iconColor={tenant.ai_settings?.ai_enabled ? "text-emerald-500" : "text-zinc-300"}
              />
              <DetailItem 
                label="Prospecção (Discovery)" 
                value={tenant.discovery_enabled ? "Ligada" : "Desligada"} 
                icon={Zap}
                iconColor={tenant.discovery_enabled ? "text-emerald-500" : "text-zinc-300"}
              />
            </CardContent>
          </Card>

          {/* Sessão: Equipe */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Equipe ({tenant.memberships.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenant.memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs">
                        {m.user.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.user.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{m.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Mini Timeline & Meta */}
        <div className="space-y-8">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailItem label="ID do Sistema" value={tenant.id} valueClass="font-mono text-[10px]" />
              <DetailItem label="Data de Criação" value={new Date(tenant.created_at).toLocaleString()} />
              <DetailItem label="Última Atualização" value={new Date(tenant.updated_at).toLocaleString()} />
              <DetailItem label="Onboarding Status" value={tenant.onboarding_status} />
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800 bg-blue-500/5">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-blue-600 font-medium italic">
                "Esta conta está sendo monitorada pelo admin global."
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────

function StatBox({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="bg-white dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 min-w-[120px]">
      <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider text-[10px]">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon: Icon, iconColor, valueClass }: { label: string; value: any; icon?: any; iconColor?: string; valueClass?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
        <div className={`text-sm font-medium ${valueClass || ""}`}>{value}</div>
      </div>
    </div>
  );
}
