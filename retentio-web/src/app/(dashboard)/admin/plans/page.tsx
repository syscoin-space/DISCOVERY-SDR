"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, 
  CreditCard, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  DollarSign,
  Users,
  Zap
} from "lucide-react";
import { billingApi, type PlanDetails } from "@/lib/api/billing.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await billingApi.getPlans();
      setPlans(data);
    } catch (error) {
      console.error("Failed to load plans", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Gestão de Planos</h1>
          <p className="text-muted-foreground">
            Configure os pacotes, limites e precificação do SaaS.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative overflow-hidden border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <CardTitle className="mt-4 text-xl">{plan.name}</CardTitle>
              <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
              {plan.trial_days > 0 && (
                <div className="mt-2 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 w-max px-2 py-1 rounded-md">
                  {plan.trial_days} dias de Trial Grátis
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900 dark:text-white">R$ {plan.price_monthly}</span>
                <span className="text-zinc-500 text-sm">/mês</span>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Limites do Plano</p>
                <div className="grid grid-cols-2 gap-3">
                  <LimitItem icon={Users} label="SDRs" value={plan.limits.sdr} />
                  <LimitItem icon={Zap} label="Leads" value={plan.limits.leads_monthly} />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1 rounded-lg h-10">
                  <Edit2 className="w-3.5 h-3.5 mr-2" />
                  Editar
                </Button>
                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg w-10 h-10 p-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-600 text-white rounded-3xl overflow-hidden border-none shadow-2xl shadow-blue-600/20">
        <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-black tracking-tight">Precisa de um plano customizado?</h2>
            <p className="text-blue-100 text-lg opacity-90">
              Você pode criar planos Enterprise com limites ilimitados diretamente no banco ou via API.
            </p>
          </div>
          <div className="flex gap-4">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-zinc-100 font-bold rounded-2xl h-14 px-8">
              Documentação de Planos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LimitItem({ icon: Icon, label, value }: { icon: any, label: string, value: any }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
      <Icon className="w-3.5 h-3.5 text-zinc-400" />
      <div className="flex flex-col">
        <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
      </div>
    </div>
  );
}
