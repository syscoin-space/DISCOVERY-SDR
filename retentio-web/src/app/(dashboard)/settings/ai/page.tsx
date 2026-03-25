"use client";

import { useState, useEffect } from "react";
import { aiApi, TenantAIProvider, TenantAISettings, AIProviderType } from "@/lib/api/ai.api";
import { 
  Zap, 
  Shield, 
  Key, 
  Save, 
  Loader2, 
  Cpu, 
  Settings2, 
  History,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/components/shared/Toast";
import { cn } from "@/lib/utils";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function AISettingsPage() {
  const [settings, setSettings] = useState<TenantAISettings | null>(null);
  const [providers, setProviders] = useState<TenantAIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [localKeys, setLocalKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await aiApi.getSettings();
      setSettings(data.settings);
      setProviders(data.providers);
      
      const keyMap: Record<string, string> = {};
      data.providers.forEach(p => {
        if (p.api_key_encrypted) {
          keyMap[p.provider] = p.api_key_encrypted;
        }
      });
      setLocalKeys(keyMap);
    } catch (e) {
      toast("Erro ao carregar configurações de IA", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSave = async (providerType: AIProviderType) => {
    setSaving(true);
    try {
      const existing = providers.find(p => p.provider === providerType);
      const is_enabled = existing ? existing.is_enabled : false;
      const default_model = existing ? existing.default_model : '';
      
      const apiKeyVal = localKeys[providerType] || '';
      const isNewKey = apiKeyVal.length > 0 && !apiKeyVal.includes('...****...');

      const payload: any = { is_enabled, default_model };
      if (isNewKey) payload.api_key = apiKeyVal;

      const res = await aiApi.updateProvider(providerType, payload);
      
      setProviders(prev => {
        const idx = prev.findIndex(p => p.provider === providerType);
        if (idx >= 0) {
          const newArr = [...prev];
          newArr[idx] = res.provider;
          return newArr;
        }
        return [...prev, res.provider];
      });

      setLocalKeys(prev => ({
        ...prev,
        [providerType]: res.provider.api_key_encrypted || ''
      }));

      toast(`Provider ${providerType} atualizado!`, "success");
    } catch (e) {
      toast("Erro ao salvar provider", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProvider = async (providerType: AIProviderType, currentVal: boolean) => {
    const existing = providers.find(p => p.provider === providerType);
    if (!existing) {
      toast("Salve a credencial antes de ativar", "error");
      return;
    }
    
    const newVal = !currentVal;
    setProviders(prev => prev.map(p => p.provider === providerType ? { ...p, is_enabled: newVal } : p));
    
    try {
      await aiApi.updateProvider(providerType, { is_enabled: newVal });
      toast(newVal ? "Provider ativado" : "Provider desativado", "success");
    } catch (e) {
      setProviders(prev => prev.map(p => p.provider === providerType ? { ...p, is_enabled: currentVal } : p));
      toast("Erro ao alternar status", "error");
    }
  };

  const updateGovernance = async (field: keyof TenantAISettings, value: any) => {
    if (!settings) return;
    const oldSettings = { ...settings };
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    
    try {
      await aiApi.updateGovernance({ [field]: value });
      toast("Ajuste de governança salvo", "success");
    } catch {
      setSettings(oldSettings);
      toast("Erro ao salvar governança", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">IA & Providers</h2>
          <p className="text-muted-foreground">Configure as LLMs e políticas de fallback da sua conta.</p>
        </div>
        {settings && (
          <div className="flex items-center gap-3 bg-accent/5 px-4 py-2 rounded-lg border border-accent/20">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-accent tracking-wider">Módulo Global</span>
              <span className="text-xs font-semibold text-foreground">{settings.ai_enabled ? "Ativado" : "Desativado"}</span>
            </div>
            <Switch
              checked={settings.ai_enabled}
              onCheckedChange={(val) => updateGovernance("ai_enabled", val)}
            />
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Provedores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {["OPENROUTER", "OPENAI", "CLAUDE", "GEMINI"].map((provType) => {
            const pType = provType as AIProviderType;
            const pData = providers.find(p => p.provider === pType) || { is_enabled: false, default_model: "" };
            const keyVal = localKeys[pType] || "";

            return (
              <Card key={pType} className="border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="border-b border-border bg-surface/50 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                       <Cpu className={cn("h-4 w-4", pData.is_enabled ? "text-accent" : "text-muted-foreground")} />
                       {pType}
                    </CardTitle>
                    <Switch
                      checked={pData.is_enabled}
                      onCheckedChange={() => handleToggleProvider(pType, pData.is_enabled!)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 flex-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">API Key</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="password"
                        value={keyVal}
                        onChange={(e) => setLocalKeys({ ...localKeys, [pType]: e.target.value })}
                        placeholder={`Sua chave ${pType}`}
                        className="pl-9 text-xs h-9 bg-surface-raised/50"
                      />
                    </div>
                    {keyVal.includes("...****...") && (
                      <p className="text-[10px] text-accent/70 italic px-1">✓ Chave encriptada salva</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Modelo Padrão</Label>
                    <Input
                      type="text"
                      value={pData.default_model || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProviders(prev => {
                          const found = prev.find(p => p.provider === pType);
                          if (found) return prev.map(p => p.provider === pType ? { ...p, default_model: val } : p);
                          return [...prev, { id: "", provider: pType, is_enabled: false, default_model: val, api_key_encrypted: "", priority_order: 0 }];
                        });
                      }}
                      placeholder="Ex: gpt-4o-mini"
                      className="text-xs h-9 bg-surface-raised/50"
                    />
                  </div>
                </CardContent>
                <div className="px-4 py-3 bg-surface-raised/30 border-t border-border/50 flex justify-end">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleProviderSave(pType)}
                    disabled={saving}
                    className="h-8 text-xs gap-2 hover:bg-accent/10 hover:text-accent"
                  >
                    <Save className="h-3 w-3" />
                    Salvar {pType}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Governança */}
        {settings && (
          <SettingsSection
            title="Roteamento e Governança"
            description="Políticas de fallback e segurança de IA."
            icon={Shield}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Fallback */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Settings2 className="h-3 w-3" />
                  Estratégia de Redundância
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Provider Principal</Label>
                    <Select 
                      value={settings.default_provider || ""}
                      onValueChange={(val) => updateGovernance("default_provider", val || null)}
                    >
                      <SelectTrigger className="h-9 bg-surface-raised/50">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
                        <SelectItem value="OPENAI">OpenAI</SelectItem>
                        <SelectItem value="CLAUDE">Claude</SelectItem>
                        <SelectItem value="GEMINI">Gemini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Provider de Fallback</Label>
                    <Select 
                      value={settings.fallback_provider || ""}
                      onValueChange={(val) => updateGovernance("fallback_provider", val || null)}
                    >
                      <SelectTrigger className="h-9 bg-surface-raised/50">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
                        <SelectItem value="OPENAI">OpenAI</SelectItem>
                        <SelectItem value="CLAUDE">Claude</SelectItem>
                        <SelectItem value="GEMINI">Gemini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-raised/30 mt-2">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium">Permitir Graceful Fallback</span>
                      <p className="text-[10px] text-muted-foreground italic">Redireciona se o principal falhar.</p>
                    </div>
                    <Switch
                      checked={settings.allow_fallback}
                      onCheckedChange={(val) => updateGovernance("allow_fallback", val)}
                    />
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <History className="h-3 w-3" />
                  Human-in-the-Loop
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-surface-raised/30">
                    <div className="space-y-1">
                      <span className="text-sm font-semibold block">Revisão Humana Obrigatória</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        O SDR deve validar e aceitar o output da IA manualmente antes da gravação.
                      </p>
                    </div>
                    <Switch
                      checked={settings.human_review_required}
                      onCheckedChange={(val) => updateGovernance("human_review_required", val)}
                    />
                  </div>

                  <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-surface-raised/30">
                    <div className="space-y-1">
                      <span className="text-sm font-semibold block">Transient AI Storage</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Salva em metadados temporários antes de persistir no lead.
                      </p>
                    </div>
                    <Switch
                      checked={settings.persist_ai_metadata_by_default}
                      onCheckedChange={(val) => updateGovernance("persist_ai_metadata_by_default", val)}
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-accent/5 rounded-lg border border-accent/20">
                     <Info className="h-3.5 w-3.5 text-accent" />
                     <p className="text-[10px] text-muted-foreground leading-snug">
                       Configurações de IA são isoladas para este tenant e não afetam outros clientes da plataforma.
                     </p>
                  </div>
                </div>
              </div>
            </div>
          </SettingsSection>
        )}
      </div>
    </div>
  );
}
