"use client";

import { useState, useEffect } from "react";
import {
  useResendConfig,
  useSaveResendConfig,
  useTestResendConnection,
  useEmailStats,
} from "@/hooks/use-resend";
import {
  Mail,
  Key,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  BarChart3,
  MousePointerClick,
  MailOpen,
  Ban,
  Bell,
  BellOff,
  Calendar,
  Unplug,
} from "lucide-react";
import {
  isPushSupported,
  getPushPermission,
  registerPushNotifications,
  unregisterPushNotifications,
} from "@/lib/push";
import {
  useGoogleStatus,
  useGoogleConnect,
  useGoogleDisconnect,
} from "@/hooks/use-google";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/use-tenant";

export default function ConfiguracoesPage() {
  const { data: config, isLoading: loadingConfig } = useResendConfig();
  const { data: stats } = useEmailStats(30);
  const saveConfig = useSaveResendConfig();
  const testConnection = useTestResendConnection();

  // Google OAuth
  const [googleJustConnected, setGoogleJustConnected] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setGoogleJustConnected(params.get("google") === "connected");
    }
  }, []);
  const { data: googleStatus, isLoading: loadingGoogle } = useGoogleStatus();
  const googleConnect = useGoogleConnect();
  const googleDisconnect = useGoogleDisconnect();

  // Tenant Settings
  const { data: tenantData } = useTenantSettings();
  const updateTenant = useUpdateTenantSettings();
  const [sdrVisibility, setSdrVisibility] = useState<"ALL" | "OWN_ONLY">(
    () => (tenantData?.settings?.sdrVisibility) || "ALL"
  );

  useEffect(() => {
    if (tenantData?.settings) {
      setSdrVisibility(tenantData.settings.sdrVisibility || "ALL");
    }
  }, [tenantData]);

  const handleSdrVisibilitySave = async () => {
    const currentSettings = tenantData?.settings || {};
    await updateTenant.mutateAsync({
      settings: { ...currentSettings, sdrVisibility },
    });
  };

  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [dailyLimit, setDailyLimit] = useState(50);
  const [showKey, setShowKey] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Push notification state
  const [pushSupported] = useState(() => typeof window !== "undefined" && isPushSupported());
  const [pushPermission, setPushPermission] = useState<string>("default");
  const [pushActivating, setPushActivating] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(() => {
    if (typeof window === "undefined") return {} as Record<string, boolean>;
    try {
      const raw = localStorage.getItem("retentio_notif_prefs");
      return raw
        ? JSON.parse(raw)
        : {
            proximo_contato: true,
            step_atrasado: true,
            tier_a_parado: true,
            bloqueio: true,
            meta_performance: true,
          };
    } catch {
      return {
        proximo_contato: true,
        step_atrasado: true,
        tier_a_parado: true,
        bloqueio: true,
        meta_performance: true,
      };
    }
  });

  useEffect(() => {
    if (pushSupported) setPushPermission(getPushPermission());
  }, [pushSupported]);

  function toggleNotifPref(key: string) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem("retentio_notif_prefs", JSON.stringify(updated));
  }

  async function handleActivatePush() {
    setPushActivating(true);
    const ok = await registerPushNotifications();
    setPushActivating(false);
    if (ok) setPushPermission("granted");
  }

  async function handleDeactivatePush() {
    await unregisterPushNotifications();
    setPushPermission("default");
  }

  const hasConfig = config !== null && config !== undefined;

  useEffect(() => {
    if (config) {
      setFromEmail(config.from_email);
      setFromName(config.from_name ?? "");
      setDailyLimit(config.daily_limit);
    }
  }, [config]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveConfig.mutateAsync({
        from_email: fromEmail,
        from_name: fromName || undefined,
        api_key: apiKey,
        daily_limit: dailyLimit,
      });
      setSaved(true);
      setApiKey("");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handled by react-query
    }
  }

  async function handleTest() {
    if (!testEmail) return;
    setTestResult(null);
    try {
      await testConnection.mutateAsync(testEmail);
      setTestResult("success");
    } catch {
      setTestResult("error");
    }
    setTimeout(() => setTestResult(null), 5000);
  }

  if (loadingConfig) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Configure sua integração de email para envio automático
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Email Stats (if has config) */}
          {hasConfig && stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Enviados (30d)"
                value={stats.total_sent}
                icon={<Send className="h-4 w-4" />}
                color="text-blue-600 bg-blue-500/10"
              />
              <StatCard
                label="Taxa Abertura"
                value={`${stats.open_rate}%`}
                icon={<MailOpen className="h-4 w-4" />}
                color="text-green-600 bg-green-500/10"
              />
              <StatCard
                label="Taxa Clique"
                value={`${stats.click_rate}%`}
                icon={<MousePointerClick className="h-4 w-4" />}
                color="text-purple-600 bg-purple-500/10"
              />
              <StatCard
                label="Bounce"
                value={`${stats.bounce_rate}%`}
                icon={<Ban className="h-4 w-4" />}
                color="text-red-600 bg-red-500/10"
              />
            </div>
          )}

          {/* Daily Usage */}
          {hasConfig && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Uso diário</span>
                <span className="text-xs text-muted-foreground">
                  {config!.sent_today} / {config!.daily_limit} emails hoje
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-2 rounded-full bg-accent transition-all"
                  style={{ width: `${Math.min(100, (config!.sent_today / config!.daily_limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* SDR Visibility Toggle */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Visibilidade entre SDRs</h3>
            <p className="text-xs text-muted-foreground">
              Define se os SDRs podem ver todos os leads do pipeline ou apenas os atribuídos a si mesmos. (Gerentes ou Owners podem ver tudo).
            </p>
            <div className="flex items-center gap-3">
              <select
                value={sdrVisibility}
                onChange={(e) => setSdrVisibility(e.target.value as any)}
                className="w-full sm:w-1/2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="ALL">Visualizar e editar todos</option>
                <option value="OWN_ONLY">Visualizar/Editar Apenas os Seus</option>
              </select>
              <button
                type="button"
                onClick={handleSdrVisibilitySave}
                disabled={updateTenant.isPending || (tenantData?.settings?.sdrVisibility || "ALL") === sdrVisibility}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
              >
                {updateTenant.isPending ? "Salvando..." : "Salvar Configuração"}
              </button>
            </div>
          </div>

          {/* Resend Config Form */}
          <form onSubmit={handleSave} className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Resend</h2>
                <p className="text-xs text-muted-foreground">
                  {hasConfig ? "Integração configurada" : "Configure sua conta Resend para envio de emails"}
                </p>
              </div>
              {hasConfig && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Ativo
                </span>
              )}
            </div>

            {/* From email */}
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                Email remetente
              </label>
              <input
                type="email"
                required
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@suaempresa.com.br"
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                O domínio precisa estar verificado no Resend
              </p>
            </div>

            {/* From name */}
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                Nome do remetente
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Vitória da Retentio"
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                <Key className="inline h-3 w-3 mr-1" />
                API Key do Resend
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  required={!hasConfig}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasConfig ? "••••••••••••••••••••" : "re_xxxxxxxxxxxxxxxxxxxxx"}
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {hasConfig && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Deixe vazio para manter a chave atual
                </p>
              )}
            </div>

            {/* Daily limit */}
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                <BarChart3 className="inline h-3 w-3 mr-1" />
                Limite diário de envios
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 50)}
                className="w-32 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saveConfig.isPending || (!apiKey && !hasConfig)}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saveConfig.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Salvar
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Configuração salva!
                </span>
              )}
              {saveConfig.isError && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Erro ao salvar
                </span>
              )}
            </div>
          </form>

          {/* Test Connection */}
          {hasConfig && (
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                <Send className="inline h-4 w-4 mr-1.5" />
                Testar conexão
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button
                  onClick={handleTest}
                  disabled={testConnection.isPending || !testEmail}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-raised disabled:opacity-50"
                >
                  {testConnection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar teste
                </button>
              </div>
              {testResult === "success" && (
                <p className="flex items-center gap-1.5 mt-3 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Email de teste enviado com sucesso!
                </p>
              )}
              {testResult === "error" && (
                <p className="flex items-center gap-1.5 mt-3 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Falha no envio — verifique a API key e o domínio verificado no Resend
                </p>
              )}
            </div>
          )}

          {/* Google Calendar + Gmail */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Google Calendar &amp; Gmail
                </h2>
                <p className="text-xs text-muted-foreground">
                  Agende reuniões e envie emails com sua conta Google
                </p>
              </div>
              {googleStatus?.connected && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </span>
              )}
            </div>

            {googleJustConnected && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <p className="text-xs text-green-600 dark:text-green-400">
                  Conta Google conectada com sucesso!
                </p>
              </div>
            )}

            {loadingGoogle ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Verificando conexão...</span>
              </div>
            ) : googleStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{googleStatus.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Escopos: Calendar, Gmail, Perfil
                    </p>
                  </div>
                  <button
                    onClick={() => googleDisconnect.mutate()}
                    disabled={googleDisconnect.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                  >
                    {googleDisconnect.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Unplug className="h-3 w-3" />
                    )}
                    Desconectar
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Reuniões serão criadas no calendar desta conta. Emails via Gmail serão enviados como este remetente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta Google para agendar reuniões com Google Meet e enviar
                  emails diretamente pelo Gmail.
                </p>
                <button
                  onClick={() => googleConnect.mutate()}
                  disabled={googleConnect.isPending}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {googleConnect.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  Conectar com Google
                </button>
              </div>
            )}
          </div>

          {/* Push Notifications */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Notificações Push
                </h2>
                <p className="text-xs text-muted-foreground">
                  Receba alertas mesmo com o navegador fechado
                </p>
              </div>
              {pushPermission === "granted" && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Ativo
                </span>
              )}
            </div>

            {!pushSupported ? (
              <p className="text-sm text-muted-foreground">
                Seu navegador não suporta notificações push.
              </p>
            ) : pushPermission === "denied" ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
                <BellOff className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">
                  Notificações foram bloqueadas no navegador. Acesse as
                  configurações do site para reativar.
                </p>
              </div>
            ) : pushPermission === "granted" ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-600 font-medium">
                  Notificações ativadas
                </span>
                <button
                  onClick={handleDeactivatePush}
                  className="text-xs text-red-500 hover:text-red-600 underline"
                >
                  Desativar
                </button>
              </div>
            ) : (
              <button
                onClick={handleActivatePush}
                disabled={pushActivating}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {pushActivating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Ativar notificações
              </button>
            )}

            {/* Preferences toggles */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Tipos de notificação
              </h4>
              {[
                { key: "proximo_contato", label: "Próximo contato (30min antes)" },
                { key: "step_atrasado", label: "Steps de cadência atrasados" },
                { key: "tier_a_parado", label: "Lead Tier A parado" },
                { key: "bloqueio", label: "Alertas de bloqueio" },
                { key: "meta_performance", label: "Metas e performance (gestor)" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifPrefs[key] ?? true}
                    onClick={() => toggleNotifPref(key)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      notifPrefs[key] ?? true
                        ? "bg-blue-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        notifPrefs[key] ?? true
                          ? "translate-x-[18px]"
                          : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
