import { useState, useEffect } from "react";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/use-tenant";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/Toast";
import { Building2, Globe, HelpCircle, Loader2, Zap } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function AccountPage() {
  const { data: settings, isLoading } = useTenantSettings();
  const updateTenant = useUpdateTenantSettings();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [discoveryEnabled, setDiscoveryEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name);
      setDiscoveryEnabled(settings.discovery_enabled);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateTenant.mutateAsync({
        name,
        discovery_enabled: discoveryEnabled,
      });
      toast("Configurações atualizadas com sucesso!", "success");
    } catch (error) {
      toast("Erro ao atualizar configurações.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Geral</h2>
        <p className="text-muted-foreground">Gerencie as informações básicas da sua conta.</p>
      </div>

      <div className="grid gap-6">
        {/* Identidade da Conta */}
        <SettingsSection
          title="Identidade da Conta"
          description="Nome exibido para membros e em comunicações."
          icon={Building2}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Nome da Empresa</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Minha Empresa Corp"
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Slug (URL da Conta)
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-raised border border-border text-sm text-muted-foreground select-all font-mono max-w-md opacity-70">
                app.discoverysdr.com.br/{settings?.slug}
              </div>
              <p className="text-[10px] text-muted-foreground italic">* O slug é fixo por questões de segurança e integridade de dados.</p>
            </div>
          </div>
        </SettingsSection>

        {/* Configurações Operacionais */}
        <SettingsSection
          title="Operação de Leads"
          description="Configure como seu fluxo de SDR deve se comportar."
          icon={Zap}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Etapa de Discovery</Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Quando ativado, os leads devem passar por uma etapa de descoberta de decisores antes de entrar em prospecção ativa.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded border border-amber-200/50 dark:border-amber-900/50 w-fit">
                <HelpCircle className="h-3 w-3" />
                Impacta as colunas visíveis no Kanban e no fluxo de cadência.
              </div>
            </div>
            <Switch
              checked={discoveryEnabled}
              onCheckedChange={setDiscoveryEnabled}
            />
          </div>
        </SettingsSection>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave} 
            disabled={updateTenant.isPending}
            className="px-8"
          >
            {updateTenant.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
