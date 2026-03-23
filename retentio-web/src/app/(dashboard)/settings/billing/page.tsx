"use client";

import { 
  CreditCard, 
  Zap, 
  CheckCircle2, 
  ExternalLink, 
  History, 
  Receipt,
  AlertCircle,
  Loader2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useBillingCurrentPlan, useBillingPortal } from "@/hooks/use-billing";
import { billingApi, Invoice } from "@/lib/api/billing.api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function BillingPage() {
  const { data: sub, isLoading } = useBillingCurrentPlan();
  const portal = useBillingPortal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    billingApi.getInvoices().then(setInvoices);
  }, []);

  if (isLoading || !sub) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const formatCurrency = (val: number | null) => {
    if (!val) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const nextBilling = sub.current_period_end 
    ? format(new Date(sub.current_period_end), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : "Não programado";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Faturamento</h2>
          <p className="text-muted-foreground">Gerencie seu plano, faturas e métodos de pagamento.</p>
        </div>
        <Badge variant="outline" className={cn(
          "py-1 px-3 border", 
          sub.status === "ACTIVE" || sub.status === "TRIAL"
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            : "bg-red-500/10 text-red-500 border-red-500/20"
        )}>
          {sub.status === "TRIAL" ? "Período de Teste" : sub.status === "ACTIVE" ? "Assinatura Ativa" : "Assinatura Inativa"}
        </Badge>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plano Atual */}
          <SettingsSection
            title={`Plano Atual: ${sub.plan?.name || "Nenhum"}`}
            description={`Sua próxima cobrança será em ${nextBilling}.`}
            icon={Zap}
            className="lg:col-span-2"
            footer={
              <p className="text-[10px] text-muted-foreground">
                Pagamento processado via <strong>Stripe/Asaas</strong>. Segurança de ponta a ponta.
              </p>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-3xl font-bold text-foreground">
                    {formatCurrency(sub.plan?.price_monthly)}/mês
                  </span>
                  <p className="text-xs text-muted-foreground">Faturamento mensal</p>
                </div>
                <Button 
                  onClick={() => portal.mutate()} 
                  disabled={portal.isPending}
                  className="w-full gap-2"
                >
                  {portal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar Plano"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-sm font-semibold text-foreground italic underline decoration-accent/30">O que seu plano inclui:</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {(sub.plan?.features as string[] || [
                    "Até 5.000 Leads/mês",
                    "IA Ilimitada (BYOK)",
                    "Dashboard de Gestão",
                    "Suporte Prioritário",
                    "White-label Branding",
                    "API Gateway Acesso"
                  ]).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SettingsSection>

          {/* Método de Pagamento */}
          <SettingsSection
            title="Pagamento"
            icon={CreditCard}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4 rounded-xl border border-border p-4 bg-surface-raised/50">
                <div className="h-10 w-12 bg-neutral-800 rounded-md flex items-center justify-center border border-border">
                  <CreditCard className="h-5 w-5 text-neutral-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-mono">•••• •••• •••• 4242</span>
                  <span className="text-[10px] text-muted-foreground">Gerenciado no Portal</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="w-full gap-2 text-xs"
              >
                {portal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar Cartão"}
              </Button>
            </div>
          </SettingsSection>
        </div>

        {/* Uso de Recursos */}
        <SettingsSection
          title="Uso do Ciclo Atual"
          description="Consumo de recursos até o momento."
          icon={History}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-xs">Leads Mensais</Label>
                <span className="text-xs font-bold">{sub.usage.leads_monthly} / {sub.plan?.limits?.leads_monthly || 5000}</span>
              </div>
              <Progress value={(sub.usage.leads_monthly / (sub.plan?.limits?.leads_monthly || 5000)) * 100} className="h-2 bg-surface-raised" />
              <p className="text-[10px] text-muted-foreground italic">Consumo de leads no mês atual</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-xs">SDRs Ativos</Label>
                <span className="text-xs font-bold">{sub.usage.sdr} / {sub.plan?.limits?.sdr || 3}</span>
              </div>
              <Progress value={(sub.usage.sdr / (sub.plan?.limits?.sdr || 3)) * 100} className="h-2 bg-surface-raised" />
              <p className="text-[10px] text-muted-foreground italic">Assentos de SDR ocupados</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-xs">Closers Ativos</Label>
                <span className="text-xs font-bold">{sub.usage.closer} / {sub.plan?.limits?.closer || 1}</span>
              </div>
              <Progress value={(sub.usage.closer / (sub.plan?.limits?.closer || 1)) * 100} className="h-2 bg-surface-raised" />
              <p className="text-[10px] text-muted-foreground italic">Assentos de Closer ocupados</p>
            </div>
          </div>
        </SettingsSection>

        {/* Histórico de Faturas */}
        <SettingsSection
          title="Últimas Faturas"
          icon={Receipt}
          contentClassName="p-0"
        >
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-surface-raised/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Data</th>
                    <th className="px-6 py-3 font-semibold">Valor</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="px-6 py-4">{invoice.date}</td>
                      <td className="px-6 py-4 font-semibold">{invoice.amount}</td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "flex items-center gap-1.5",
                          invoice.status === "Pago" ? "text-emerald-500" : "text-amber-500"
                        )}>
                          <CheckCircle2 className="h-3 w-3" />
                          {invoice.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.open(invoice.pdf_url || '#', '_blank')}
                          className="h-8 gap-2 opacity-60 hover:opacity-100"
                        >
                          <ExternalLink className="h-3 w-3" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold">Nenhuma fatura encontrada</h3>
              <p className="text-xs text-muted-foreground mt-1">Quando houver cobranças, elas aparecerão aqui.</p>
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}
