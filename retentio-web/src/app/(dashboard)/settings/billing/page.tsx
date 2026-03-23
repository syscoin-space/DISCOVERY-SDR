"use client";

import { 
  CreditCard, 
  Zap, 
  CheckCircle2, 
  ExternalLink, 
  History, 
  Receipt,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

export default function BillingPage() {
  // Mock data for now, as billing integration is often external (Stripe/etc)
  const subscription = {
    plan: "Pro",
    status: "active",
    price: "R$ 499/mês",
    nextBilling: "15 de Outubro, 2024",
    usage: {
      leads: 1250,
      leadsLimit: 5000,
      emails: 8400,
      emailsLimit: 10000,
      users: 5,
      usersLimit: 10
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Faturamento</h2>
          <p className="text-muted-foreground">Gerencie seu plano, faturas e métodos de pagamento.</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1 px-3">
          Assinatura Ativa
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Plano Atual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="border-b border-border bg-surface/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                Plano Atual: {subscription.plan}
              </CardTitle>
              <CardDescription>Sua próxima cobrança será em {subscription.nextBilling}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-3xl font-bold text-foreground">{subscription.price}</span>
                    <p className="text-xs text-muted-foreground">Faturamento mensal</p>
                  </div>
                  <Button className="w-full gap-2">
                    Alterar Plano
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="md:col-span-2 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground italic underline decoration-accent/30">O que seu plano inclui:</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      "Até 5.000 Leads/mês",
                      "IA Ilimitada (BYOK)",
                      "Dashboard de Gestão",
                      "Suporte Prioritário",
                      "White-label Branding",
                      "API Gateway Acesso"
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border bg-surface-raised/30 px-6 py-3">
              <p className="text-[10px] text-muted-foreground">
                Pagamento processado via <strong>Stripe</strong>. Segurança de ponta a ponta.
              </p>
            </CardFooter>
          </Card>

          {/* Método de Pagamento */}
          <Card className="border border-border bg-surface shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border bg-surface/50">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4 rounded-xl border border-border p-4 bg-surface-raised/50">
                <div className="h-10 w-12 bg-neutral-800 rounded-md flex items-center justify-center border border-border">
                  <CreditCard className="h-5 w-5 text-neutral-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-mono">•••• •••• •••• 4242</span>
                  <span className="text-[10px] text-muted-foreground">Expira em 12/26 • VISA</span>
                </div>
              </div>
              <Button variant="outline" className="w-full gap-2 text-xs">
                Atualizar Cartão
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Uso de Recursos */}
        <Card className="border border-border bg-surface shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-surface/50">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-accent" />
              Uso do Ciclo Atual
            </CardTitle>
            <CardDescription>Consumo de recursos até o momento.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <Label className="text-xs">Leads Ativos</Label>
                  <span className="text-xs font-bold">{subscription.usage.leads} / {subscription.usage.leadsLimit}</span>
                </div>
                <Progress value={(subscription.usage.leads / subscription.usage.leadsLimit) * 100} className="h-2 bg-surface-raised" />
                <p className="text-[10px] text-muted-foreground italic">25% do limite utilizado</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <Label className="text-xs">E-mails Enviados</Label>
                  <span className="text-xs font-bold">{subscription.usage.emails} / {subscription.usage.emailsLimit}</span>
                </div>
                <Progress value={(subscription.usage.emails / subscription.usage.emailsLimit) * 100} className="h-2 bg-surface-raised" />
                <p className="text-[10px] text-muted-foreground italic">84% do limite utilizado - <span className="text-amber-500 font-semibold">Quase no limite</span></p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <Label className="text-xs">Membros da Equipe</Label>
                  <span className="text-xs font-bold">{subscription.usage.users} / {subscription.usage.usersLimit}</span>
                </div>
                <Progress value={(subscription.usage.users / subscription.usage.usersLimit) * 100} className="h-2 bg-surface-raised" />
                <p className="text-[10px] text-muted-foreground italic">5 de 10 assentos ocupados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Faturas (Mock) */}
        <Card className="border border-border bg-surface shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-surface/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-accent" />
              Últimas Faturas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                  {[
                    { date: "15 Set, 2024", amount: "R$ 499,00", status: "Pago" },
                    { date: "15 Ago, 2024", amount: "R$ 499,00", status: "Pago" },
                    { date: "15 Jul, 2024", amount: "R$ 499,00", status: "Pago" },
                  ].map((invoice, i) => (
                    <tr key={i} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="px-6 py-4">{invoice.date}</td>
                      <td className="px-6 py-4 font-semibold">{invoice.amount}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" />
                          {invoice.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 gap-2 opacity-60 hover:opacity-100">
                          <ExternalLink className="h-3 w-3" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
