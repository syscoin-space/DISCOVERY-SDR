'use client';

import { useState, useEffect } from 'react';
import { aiApi, TenantAIProvider, TenantAISettings, AIProviderType } from '@/lib/api/ai.api';
import { Eye, EyeOff, Save, CheckCircle, AlertTriangle, KeyIcon, Settings } from 'lucide-react';

export default function AISettingsPage() {
  const [settings, setSettings] = useState<TenantAISettings | null>(null);
  const [providers, setProviders] = useState<TenantAIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // For managing local input states before saving
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
          keyMap[p.provider] = p.api_key_encrypted; // 'sk-****...' masked
        }
      });
      setLocalKeys(keyMap);
    } catch (e) {
      showToast('Erro ao carregar configurações de IA', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleProviderSave = async (providerType: AIProviderType) => {
    setSaving(true);
    try {
      const existing = providers.find(p => p.provider === providerType);
      const is_enabled = existing ? existing.is_enabled : false;
      const default_model = existing ? existing.default_model : '';
      
      const apiKeyVal = localKeys[providerType] || '';
      
      // We only send api_key if it does NOT contain the mask pattern
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

      // Update local key map with the fresh MASKED key received
      setLocalKeys(prev => ({
        ...prev,
        [providerType]: res.provider.api_key_encrypted || ''
      }));

      showToast(`Provider ${providerType} atualizado!`, 'success');
    } catch (e) {
      showToast('Erro ao salvar provider', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProvider = async (providerType: AIProviderType, currentVal: boolean) => {
    const existing = providers.find(p => p.provider === providerType);
    if (!existing) {
      showToast('Salve a credencial antes de ativar', 'error');
      return;
    }
    
    // Optimistic UI
    const newVal = !currentVal;
    setProviders(prev => prev.map(p => p.provider === providerType ? { ...p, is_enabled: newVal } : p));
    
    try {
      await aiApi.updateProvider(providerType, { is_enabled: newVal });
      showToast(newVal ? 'Ativado' : 'Desativado', 'success');
    } catch (e) {
      // Revert UI on fail
      setProviders(prev => prev.map(p => p.provider === providerType ? { ...p, is_enabled: currentVal } : p));
      showToast('Erro ao alternar status', 'error');
    }
  };

  const updateGovernance = async (field: keyof TenantAISettings, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings); // optimistic
    
    try {
      await aiApi.updateGovernance({ [field]: value });
      showToast('Ajuste salvo', 'success');
    } catch {
      setSettings(settings); // revert
      showToast('Erro ao salvar governança', 'error');
    }
  };

  if (loading) return <div className="p-8 text-neutral-400">Carregando configurações...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg border z-50 flex items-center gap-2 
          ${toast.type === 'success' ? 'bg-green-900/50 border-green-500 text-green-100' : 'bg-red-900/50 border-red-500 text-red-100'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-500" /> API Settings & AI Providers
        </h1>
        <p className="text-neutral-400 mt-2">
          Configure as credenciais isoladas por provedor e as políticas de fallback do seu hub Multi-Tenant de IA.
        </p>
      </div>

      <div className="space-y-8">
        {/* --- Providers Section --- */}
        <div>
          <h2 className="text-lg font-medium text-neutral-200 mb-4 border-b border-neutral-800 pb-2">Providers Ativados</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI'].map((provType) => {
              const pType = provType as AIProviderType;
              const pData = providers.find(p => p.provider === pType) || { is_enabled: false, default_model: '' };
              const keyVal = localKeys[pType] || '';

              return (
                <div key={pType} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
                  
                  {/* Header: Title and Toggle */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-neutral-100">
                      <div className={`w-2 h-2 rounded-full ${pData.is_enabled ? 'bg-green-500' : 'bg-neutral-600'}`}></div>
                      {pType}
                    </h3>
                    
                    <button 
                      onClick={() => handleToggleProvider(pType, pData.is_enabled!)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none 
                        ${pData.is_enabled ? 'bg-brand-600' : 'bg-neutral-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${pData.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">API Key</label>
                      <div className="relative">
                        <KeyIcon className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                        <input 
                          type="text" 
                          value={keyVal}
                          onChange={(e) => setLocalKeys({ ...localKeys, [pType]: e.target.value })}
                          placeholder={`Coloque a API Key do ${pType}`}
                          className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      {keyVal.includes('...****...') && (
                        <p className="text-xs text-neutral-500 mt-1">Chave salva. Digite uma nova para substituir.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Default Model</label>
                      <input 
                        type="text" 
                        value={pData.default_model || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProviders(prev => {
                            const found = prev.find(p => p.provider === pType);
                            if (found) {
                              return prev.map(p => p.provider === pType ? { ...p, default_model: val } : p);
                            } else {
                              // Pseudo-add to state to edit before save
                              return [...prev, { id: '', provider: pType, is_enabled: false, default_model: val, api_key_encrypted: '', priority_order: 0 }];
                            }
                          });
                        }}
                        placeholder="Ex: openai/gpt-4o-mini"
                        className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        onClick={() => handleProviderSave(pType)}
                        disabled={saving}
                        className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salvar {pType}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Governance Section --- */}
        {settings && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
              <h2 className="text-lg font-medium text-neutral-200">Roteamento e Governança</h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Routing */}
              <div className="space-y-6">
                <h3 className="text-sm uppercase tracking-wider text-neutral-500 font-semibold mb-2">Roteamento Híbrido</h3>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Provider Global (Default)</label>
                  <select 
                    value={settings.default_provider || ''}
                    onChange={(e) => updateGovernance('default_provider', e.target.value || null)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-200 outline-none"
                  >
                    <option value="">(Nenhum)</option>
                    <option value="OPENROUTER">OpenRouter</option>
                    <option value="OPENAI">OpenAI</option>
                    <option value="CLAUDE">Claude</option>
                    <option value="GEMINI">Gemini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Provider para Fallback</label>
                  <select 
                    value={settings.fallback_provider || ''}
                    onChange={(e) => updateGovernance('fallback_provider', e.target.value || null)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-200 outline-none"
                  >
                    <option value="">(Nenhum)</option>
                    <option value="OPENROUTER">OpenRouter</option>
                    <option value="OPENAI">OpenAI</option>
                    <option value="CLAUDE">Claude</option>
                    <option value="GEMINI">Gemini</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-neutral-300">Permitir Graceful Fallback</span>
                  <button 
                    onClick={() => updateGovernance('allow_fallback', !settings.allow_fallback)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.allow_fallback ? 'bg-brand-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.allow_fallback ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Security & Validation */}
              <div className="space-y-6">
                <h3 className="text-sm uppercase tracking-wider text-neutral-500 font-semibold mb-2">Segurança (Human-in-the-Loop)</h3>

                <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                  <div>
                    <span className="block text-sm font-medium text-neutral-300">Revisão Humana Obrigatória</span>
                    <span className="block text-xs text-neutral-500 mt-1">SDR deve clicar em "Aceitar" para salvar JSON</span>
                  </div>
                  <button 
                    onClick={() => updateGovernance('human_review_required', !settings.human_review_required)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.human_review_required ? 'bg-brand-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.human_review_required ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                  <div>
                    <span className="block text-sm font-medium text-neutral-300">Transient AI Status</span>
                    <span className="block text-xs text-neutral-500 mt-1">Salvar em ai_metadata primeiro</span>
                  </div>
                  <button 
                    onClick={() => updateGovernance('persist_ai_metadata_by_default', !settings.persist_ai_metadata_by_default)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.persist_ai_metadata_by_default ? 'bg-brand-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.persist_ai_metadata_by_default ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-green-900/10 p-4 rounded-lg border border-green-900/30">
                  <div>
                    <span className="block text-sm font-medium text-green-400">Hub de IA Ativado</span>
                    <span className="block text-xs text-green-500/70 mt-1">Ligar/Desligar todo o módulo (Tenant global)</span>
                  </div>
                  <button 
                    onClick={() => updateGovernance('ai_enabled', !settings.ai_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.ai_enabled ? 'bg-green-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.ai_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
