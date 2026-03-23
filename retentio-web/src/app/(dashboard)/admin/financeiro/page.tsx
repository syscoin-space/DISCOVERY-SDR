"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api/client";

// ─── Types ──────────────────────────────────────────────────────────

interface AsaasStatus {
  configured: boolean;
  environment: "sandbox" | "production";
  base_url: string;
  key_preview: string | null;
}

interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  customers_found?: number;
}

interface Metrics {
  mrr: number;
  total_tenants: number;
  active: number;
  trial: number;
  past_due: number;
  canceled: number;
  total_subscriptions: number;
}

interface SubscriptionRow {
  id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_active: boolean;
  plan_name: string;
  plan_key: string;
  plan_price: number | null;
  status: string;
  price: number | null;
  currency: string;
  current_period_end: string | null;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  created_at: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [status, setStatus] = useState<AsaasStatus | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statusRes, metricsRes, subsRes] = await Promise.all([
        api.get("/admin/billing/status"),
        api.get("/admin/billing/metrics"),
        api.get("/admin/billing/subscriptions"),
      ]);
      setStatus(statusRes.data);
      setMetrics(metricsRes.data);
      setSubscriptions(subsRes.data);
    } catch (err) {
      console.error("[Financeiro] Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/admin/billing/test-connection");
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    TRIAL: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PAST_DUE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    CANCELED: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  const statusLabel: Record<string, string> = {
    ACTIVE: "Ativa",
    TRIAL: "Trial",
    PAST_DUE: "Inadimplente",
    CANCELED: "Cancelada",
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Financeiro
          </h1>
          <p className="text-muted-foreground">
            Gestão financeira global do SaaS — integração Asaas, receita e assinaturas.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* ─── 1. Status da Integração Asaas ─── */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5 text-blue-500" />
            Integração Asaas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${status?.configured ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <div>
                <p className="text-sm font-medium">{status?.configured ? "Configurado" : "Não configurado"}</p>
                <p className="text-[10px] text-muted-foreground">API Key</p>
              </div>
            </div>

            {/* Ambiente */}
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium capitalize">{status?.environment || "—"}</p>
                <p className="text-[10px] text-muted-foreground">Ambiente</p>
              </div>
            </div>

            {/* Key Preview */}
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-mono">{status?.key_preview || "—"}</p>
                <p className="text-[10px] text-muted-foreground">Chave</p>
              </div>
            </div>

            {/* Teste de Conexão */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={testResult?.success ? "outline" : "default"}
                onClick={handleTestConnection}
                disabled={testing || !status?.configured}
                className="gap-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testResult?.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                {testing ? "Testando..." : testResult?.success ? "Conectado!" : "Testar Conexão"}
              </Button>
              {testResult && !testResult.success && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <WifiOff className="h-3 w-3" />
                  {testResult.error}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Métricas Globais ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="MRR"
          value={formatCurrency(metrics?.mrr ?? 0)}
          icon={DollarSign}
          color="text-emerald-500"
          bgColor="bg-emerald-500/10"
        />
        <MetricCard
          label="Tenants Ativos"
          value={String(metrics?.total_tenants ?? 0)}
          icon={Users}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <MetricCard
          label="Assinaturas Ativas"
          value={String(metrics?.active ?? 0)}
          icon={CheckCircle2}
          color="text-emerald-500"
          bgColor="bg-emerald-500/10"
        />
        <MetricCard
          label="Trials"
          value={String(metrics?.trial ?? 0)}
          icon={Zap}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <MetricCard
          label="Inadimplentes"
          value={String(metrics?.past_due ?? 0)}
          icon={AlertCircle}
          color="text-amber-500"
          bgColor="bg-amber-500/10"
        />
        <MetricCard
          label="Canceladas"
          value={String(metrics?.canceled ?? 0)}
          icon={TrendingUp}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
      </div>

      {/* ─── 3. Lista de Assinaturas ─── */}
      <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Assinaturas ({subscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase bg-zinc-50 dark:bg-zinc-900 text-muted-foreground border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tenant</th>
                  <th className="px-4 py-3 text-left font-semibold">Plano</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor/mês</th>
                  <th className="px-4 py-3 text-left font-semibold">Próx. Vencimento</th>
                  <th className="px-4 py-3 text-left font-semibold">Gateway Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhuma assinatura encontrada.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">{sub.tenant_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{sub.tenant_slug}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{sub.plan_name}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs border ${statusColor[sub.status] || ""}`}>
                          {statusLabel[sub.status] || sub.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono">
                        {formatCurrency(sub.price || sub.plan_price)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub.gateway_subscription_id ? (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {sub.gateway_subscription_id.slice(0, 16)}...
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Sem gateway</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Subcomponent ───────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
