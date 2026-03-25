"use client";

import { useState, useEffect } from "react";
import { useEmailConfig } from "@/hooks/use-email-config";
import { useEmailHealth } from "@/hooks/use-email-health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Mail, 
  ShieldCheck, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function EmailSettingsPage() {
  const { config, isLoading, upsert, test, isRefetching } = useEmailConfig();
  const { data: health, isLoading: isLoadingHealth } = useEmailHealth();
  
  const [apiKey, setApiKey] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (config) {
      setSenderName(config.sender_name || "");
      setSenderEmail(config.sender_email || "");
      setReplyTo(config.reply_to || "");
      setIsEnabled(config.is_enabled);
    }
  }, [config]);

  const handleSave = async () => {
    await upsert.mutateAsync({
      provider: "RESEND",
      is_enabled: isEnabled,
      api_key: apiKey || undefined, // Só envia se preenchido
      sender_name: senderName,
      sender_email: senderEmail,
      reply_to: replyTo || null,
    });
    if (apiKey) setApiKey(""); // Limpa o campo local após salvar a chave encrypted
  };

  const handleTest = async () => {
    if (!testEmail) return;
    await test.mutateAsync({
      provider: "RESEND",
      api_key: apiKey || undefined,
      to: testEmail
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const hasChanges = 
    apiKey !== "" ||
    senderName !== (config?.sender_name || "") ||
    senderEmail !== (config?.sender_email || "") ||
    replyTo !== (config?.reply_to || "") ||
    isEnabled !== config?.is_enabled;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuração de E-mail</h2>
          <p className="text-muted-foreground">Gerencie como o sistema envia comunicações em seu nome.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || upsert.isPending}
          className="gap-2 shadow-lg shadow-accent/20"
        >
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {upsert.isPending ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Health Status Dashboard */}
        {health && (
          <SettingsSection
            title="Saúde do Canal"
            description="Status operacional e diagnóstico em tempo real."
            icon={Activity}
          >
            <div className={cn(
              "p-4 rounded-xl border transition-colors",
              health.status === 'HEALTHY' ? 'bg-green-500/5 border-green-500/20' :
              health.status === 'WARNING' ? 'bg-amber-500/5 border-amber-500/20' :
              health.status === 'CRITICAL' ? 'bg-red-500/5 border-red-500/20' :
              'bg-muted/5 border-border'
            )}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  health.status === 'HEALTHY' ? 'text-green-500' :
                  health.status === 'WARNING' ? 'text-amber-500' :
                  health.status === 'CRITICAL' ? 'text-red-500' :
                  'text-muted-foreground'
                )}>
                  {health.status === 'HEALTHY' ? <CheckCircle className="h-6 w-6" /> :
                   health.status === 'CRITICAL' ? <XCircle className="h-6 w-6" /> :
                   <AlertCircle className="h-6 w-6" />}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">Status: {
                        health.status === 'HEALTHY' ? 'Saudável' :
                        health.status === 'WARNING' ? 'Atenção Requerida' :
                        health.status === 'CRITICAL' ? 'Canal Bloqueado' :
                        'Inativo'
                      }</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {health.status === 'HEALTHY' ? 'Sua infraestrutura de e-mail está operacional.' : 
                         'Existem impedimentos técnicos que podem afetar o envio.'}
                      </p>
                    </div>
                    {health.last_success_at && (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Último Sucesso</p>
                        <p className="text-xs font-mono">{format(new Date(health.last_success_at), "HH:mm 'de' dd/MM")}</p>
                      </div>
                    )}
                  </div>

                  {health.issues.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Problemas Detectados:</p>
                      {health.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-foreground/80">
                          <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}

                  {health.last_error && health.status !== 'HEALTHY' && (
                    <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20">
                      <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1.5 mb-1">
                        <XCircle className="h-3 w-3" />
                        Último Erro Detectado
                      </p>
                      <p className="text-xs text-red-400 italic font-mono leading-relaxed">
                        "{health.last_error.message}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {/* Provider Config */}
        <SettingsSection
          title="Provedor de E-mail"
          description="Ative e configure sua chave de API para envios automáticos."
          icon={Mail}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-raised/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white p-2 flex items-center justify-center shadow-sm">
                  <img src="https://resend.com/static/brand/resend-icon-black.svg" alt="Resend" className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Resend</h4>
                  <p className="text-xs text-muted-foreground">Plataforma de e-mail focada em desenvolvedores.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full", 
                  isEnabled ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground")}>
                  {isEnabled ? "Ativado" : "Desativado"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isEnabled ? "bg-accent" : "bg-border"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    isEnabled ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  API Key do Resend
                </Label>
                <div className="relative max-w-lg">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={config?.api_key_masked || "re_...xxxxxxxx"}
                    className="bg-surface pr-10"
                  />
                  {config?.api_key_masked && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-500 uppercase">
                      Configurada
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">A sua chave é armazenada com criptografia AES-256-CBC de nível bancário.</p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Sender Identity */}
        <SettingsSection
          title="Identidade do Remetente"
          description="Como os destinatários verão seus e-mails."
          icon={Send}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nome do Remetente</Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Ex: João da Discovery"
                className="bg-surface"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail do Remetente</Label>
              <Input
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="joao@seudominio.com.br"
                className="bg-surface"
              />
              <p className="text-[10px] text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                O domínio deve estar validado no dashboard do Resend.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Responder para (Reply-To)</Label>
              <Input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="contato@seudominio.com.br"
                className="bg-surface"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Test Connection */}
        <SettingsSection
          title="Validar Integração"
          description="Envie um e-mail de teste para garantir que tudo está correto."
          icon={RefreshCw}
        >
           <div className="flex items-end gap-4 max-w-lg">
              <div className="flex-1 space-y-2">
                <Label>E-mail para Teste</Label>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu@e-mail.com.br"
                  className="bg-surface"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleTest}
                disabled={!testEmail || test.isPending}
                className="gap-2"
              >
                {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {test.isPending ? "Testando..." : "Testar Agora"}
              </Button>
           </div>
        </SettingsSection>
      </div>
    </div>
  );
}
