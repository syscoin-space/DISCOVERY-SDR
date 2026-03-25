"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Layout,
  LayoutDashboard,
  ShieldCheck,
  MoreVertical,
  ExternalLink,
  CreditCard,
  User,
  Users,
  Activity,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  Globe,
  Palette,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api/client";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  discovery_enabled: boolean;
  onboarding_status: string;
  onboarding_step: number;
  plan: string;
  plan_key?: string;
  subscription_status: string;
  subscription_end: string | null;
  owner_name: string;
  owner_email: string;
  user_count: number;
  health: {
    onboarding_completed: boolean;
    branding_configured: boolean;
    ai_configured: boolean;
  };
}

// ─── Component ──────────────────────────────────────────────────────

export default function ClientesAdminPage() {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    plan: "all",
    status: "all",
    subscriptionStatus: "all",
    onboardingStatus: "all",
    discoveryEnabled: "all",
  });

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.plan !== "all") params.append("plan", filters.plan);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.subscriptionStatus !== "all") params.append("subscriptionStatus", filters.subscriptionStatus);
      if (filters.onboardingStatus !== "all") params.append("onboardingStatus", filters.onboardingStatus);
      if (filters.discoveryEnabled !== "all") params.append("discoveryEnabled", filters.discoveryEnabled);

      const { data } = await api.get(`/admin/tenants?${params.toString()}`);
      setTenants(data);
    } catch (err) {
      console.error("[AdminClientes] Erro ao carregar clientes:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTenants();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadTenants]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    TRIAL: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PAST_DUE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    CANCELED: "bg-red-500/10 text-red-600 border-red-500/20",
    INACTIVE: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-500" />
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gestão global de contas e clientes do Discovery SDR.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadTenants} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* ─── Filtros ─── */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou slug..."
                className="pl-9 bg-white dark:bg-zinc-950"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
              />
            </div>

            <Select value={filters.plan} onValueChange={(v) => updateFilter("plan", v || "")}>
              <SelectTrigger className="bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="BASIC">Basic</SelectItem>
                <SelectItem value="PRO">Pro</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.subscriptionStatus} onValueChange={(v) => updateFilter("subscriptionStatus", v || "")}>
              <SelectTrigger className="bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Assinatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Assinaturas</SelectItem>
                <SelectItem value="ACTIVE">Ativa</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="PAST_DUE">Inadimplente</SelectItem>
                <SelectItem value="CANCELED">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.onboardingStatus} onValueChange={(v) => updateFilter("onboardingStatus", v || "")}>
              <SelectTrigger className="bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Onboarding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status Onboarding</SelectItem>
                <SelectItem value="COMPLETED">Concluído</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.discoveryEnabled} onValueChange={(v) => updateFilter("discoveryEnabled", v || "")}>
              <SelectTrigger className="bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Discovery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Discovery (Qualquer)</SelectItem>
                <SelectItem value="true">Clientes com Discovery Ativo</SelectItem>
                <SelectItem value="false">Discovery Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabela ─── */}
      <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase bg-zinc-50 dark:bg-zinc-900 text-muted-foreground border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Cliente / Conta</th>
                  <th className="px-6 py-4 text-left font-semibold">Plano & Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Owner & Time</th>
                  <th className="px-6 py-4 text-center font-semibold">Saúde / Setup</th>
                  <th className="px-6 py-4 text-left font-semibold">Criado em</th>
                  <th className="px-6 py-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading && tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p>Carregando clientes...</p>
                      </div>
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Nenhum cliente encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  tenants.map((client) => (
                    <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group">
                      {/* Cliente / Conta */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{client.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">/{client.slug}</span>
                        </div>
                      </td>

                      {/* Plano & Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                              {client.plan}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${statusColor[client.subscription_status] || ""}`}>
                              {client.subscription_status}
                            </Badge>
                          </div>
                          {client.active ? (
                            <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Conta Ativa
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Inativa
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Owner & Time */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="text-xs font-medium">{client.owner_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-5 mt-0.5">
                            <Users className="h-3 w-3 text-zinc-400" />
                            <span className="text-[10px] text-zinc-400">{client.user_count} usuários</span>
                          </div>
                        </div>
                      </td>

                      {/* Saúde / Setup */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <HealthIcon 
                            label="Onboarding" 
                            active={client.health.onboarding_completed} 
                            icon={LayoutDashboard} 
                          />
                          <HealthIcon 
                            label="Branding" 
                            active={client.health.branding_configured} 
                            icon={Palette} 
                          />
                          <HealthIcon 
                            label="IA" 
                            active={client.health.ai_configured} 
                            icon={Brain} 
                          />
                          <HealthIcon 
                            label="Discovery" 
                            active={client.discovery_enabled} 
                            icon={Zap} 
                          />
                        </div>
                      </td>

                      {/* Criado em */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs">{new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(client.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/clientes/${client.id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500">
                              <Activity className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button size="icon" variant="ghost" className="h-8 w-8 group-hover:visible visible lg:invisible">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
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

// ─── Subcomponents ──────────────────────────────────────────────────

function HealthIcon({ label, active, icon: Icon }: { label: string; active: boolean; icon: any }) {
  return (
    <div className="flex flex-col items-center gap-1" title={label}>
      <div className={`p-1.5 rounded-md transition-colors ${active ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className={`text-[8px] font-medium uppercase tracking-tighter ${active ? "text-emerald-600" : "text-zinc-400"}`}>
        {label}
      </span>
    </div>
  );
}
