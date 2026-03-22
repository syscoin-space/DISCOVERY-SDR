"use client";

import React, { useEffect, useState } from "react";
import { 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Users, 
  BarChart3, 
  ArrowUpCircle,
  Check,
  Loader2,
  Calendar
} from "lucide-react";
import { billingApi, type PlanUsage, type PlanDetails } from "@/lib/api/billing.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

export default function BillingPage() {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [u, p] = await Promise.all([
        billingApi.getCurrentPlan(),
        billingApi.getPlans()
      ]);
      setUsage(u);
      setPlans(p);
    } catch (error) {
      console.error("Failed to load billing data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageAsaas = async () => {
    try {
      const { data } = await billingApi.getPortalUrl();
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Failed to get portal URL", error);
    }
  };

  const handleUpgrade = (planKey: string) => {
    // Para V2, redirecionamos para o checkout ou abrimos modal
    // Por enquanto, apenas logamos, mas o ideal é chamar createSubscription
    console.log("Upgrading to", planKey);
    alert(`Iniciando upgrade para o plano ${planKey}. Você será redirecionado para o Checkout.`);
  };

  const getPercentage = (used: number, limit: number) => {
    if (!limit || limit === 0) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  if (loading || !usage) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const plan = usage.plan;
  const status = usage.status;
  const nextBilling = usage.next_billing_at || usage.current_period_end;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Faturamento & Plano</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura, visualize limites e histórico de cobrança.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 overflow-hidden border-blue-500/20 bg-gradient-to-br from-background to-blue-500/5">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{plan?.name || "Plano Indisponível"}</CardTitle>
                <CardDescription>Status: {status === 'ACTIVE' ? 'Ativo' : status === 'TRIAL' ? 'Período de Teste' : 'Suspenso'}</CardDescription>
              </div>
              <Badge variant={status === 'ACTIVE' ? "default" : "secondary"} className="px-3 py-1">
                {status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Próxima cobrança: {nextBilling ? new Date(nextBilling).toLocaleDateString() : 'Não agendada'}</span>
            </div>
            
            <div className="pt-4 border-t border-primary/10 flex gap-4">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                onClick={() => handleUpgrade('PRO')}
              >
                Fazer Upgrade
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleManageAsaas}
              >
                Gerenciar no Asaas
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <UsageCard 
          icon={Users} 
          label="SDRs" 
          used={usage.usage.sdr} 
          limit={usage.plan.limits.sdr} 
          percentage={getPercentage(usage.usage.sdr, usage.plan.limits.sdr)}
          color="blue"
        />
        <UsageCard 
          icon={ShieldCheck} 
          label="Closers" 
          used={usage.usage.closer} 
          limit={usage.plan.limits.closer} 
          percentage={getPercentage(usage.usage.closer, usage.plan.limits.closer)}
          color="indigo"
        />
        <UsageCard 
          icon={BarChart3} 
          label="Leads (Mês)" 
          used={usage.usage.leads_monthly}
          limit={usage.plan.limits.leads_monthly} 
          percentage={getPercentage(usage.usage.leads_monthly, usage.plan.limits.leads_monthly)}
          color="violet"
        />
      </div>

      {/* Plans Comparison */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Escolha o plano ideal para sua escala</h2>
          <p className="text-zinc-500">Mude de plano a qualquer momento conforme seu time cresce.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative p-8 rounded-3xl border transition-all ${
                plan.key === usage.plan.key 
                  ? "border-blue-500 bg-blue-500/[0.02] shadow-xl shadow-blue-500/5 ring-1 ring-blue-500" 
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              {plan.key === usage.plan.key && (
                <div className="absolute top-0 right-12 translate-y-[-50%] bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  Plano Atual
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ {plan.price_monthly}</span>
                  <span className="text-zinc-500 text-sm">/mês</span>
                </div>
                <p className="text-sm text-zinc-500 min-h-[40px]">{plan.description}</p>
                
                <Button 
                  className={`w-full h-12 rounded-xl text-base font-bold transition-all ${
                    plan.key === usage.plan.key
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  }`}
                  disabled={plan.key === usage.plan.key}
                  onClick={() => handleUpgrade(plan.key)}
                >
                  {plan.key === usage.plan.key ? "Configurado" : "Fazer Upgrade"}
                </Button>

                <div className="pt-6 space-y-3">
                  <p className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">O que está incluído:</p>
                  <ul className="space-y-2.5">
                    <FeatureItem label={`${plan.limits.sdr} SDRs ativos`} />
                    <FeatureItem label={`${plan.limits.closer} Closers ativos`} />
                    <FeatureItem label={`${plan.limits.leads_monthly} Leads/mês`} />
                    {(Object.entries(plan.features) as [string, boolean][]).map(([key, enabled]) => (
                      enabled && <FeatureItem key={key} label={formatFeatureName(key)} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsageCard({ icon: Icon, label, used, limit, percentage, color }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 bar:bg-blue-500",
    indigo: "text-indigo-500 bg-indigo-500/10 bar:bg-indigo-500",
    violet: "text-violet-500 bg-violet-500/10 bar:bg-violet-500",
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${colors[color].split(' bar:')[0]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
      </div>
      
      <div className="flex items-end justify-between mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{used}</span>
          <span className="text-zinc-500 text-sm">/ {limit}</span>
        </div>
        <span className={`text-xs font-bold ${percentage > 90 ? "text-red-500" : "text-zinc-400"}`}>
          {percentage}%
        </span>
      </div>

      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${colors[color].split('bar:')[1]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
      <Check className="w-4 h-4 text-green-500 shrink-0" />
      {label}
    </li>
  );
}

function formatFeatureName(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}
