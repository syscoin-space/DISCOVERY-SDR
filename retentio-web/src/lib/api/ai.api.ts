import api from './client';

export type AIProviderType = 'OPENROUTER' | 'OPENAI' | 'CLAUDE' | 'GEMINI';

export interface TenantAISettings {
  ai_enabled: boolean;
  default_provider: AIProviderType | null;
  classification_provider: AIProviderType | null;
  summary_provider: AIProviderType | null;
  guidance_provider: AIProviderType | null;
  allow_fallback: boolean;
  fallback_provider: AIProviderType | null;
  human_review_required: boolean;
  persist_ai_metadata_by_default: boolean;
}

export interface TenantAIProvider {
  id: string;
  provider: AIProviderType;
  is_enabled: boolean;
  api_key_encrypted: string | null; // Mascarada pelo back
  default_model: string | null;
  priority_order: number;
}

export interface GetAISettingsResponse {
  success: boolean;
  settings: TenantAISettings;
  providers: TenantAIProvider[];
}

export const aiApi = {
  /**
   * Busca as configurações e a lista de providers do tenant (com keys mascaradas).
   */
  getSettings: async (): Promise<GetAISettingsResponse> => {
    const { data } = await api.get<GetAISettingsResponse>('/ai-settings');
    return data;
  },

  /**
   * Atualiza as regras de governança e roteamento.
   */
  updateGovernance: async (governance: Partial<TenantAISettings>): Promise<{ success: boolean; settings: TenantAISettings }> => {
    const { data } = await api.put<{ success: boolean; settings: TenantAISettings }>('/ai-settings/governance', governance);
    return data;
  },

  /**
   * Cria ou atualiza as credenciais de um provider específico.
   * Só envia api_key se o usuário digitou uma nova (não mascarada).
   */
  updateProvider: async (
    providerType: AIProviderType,
    providerData: { is_enabled?: boolean; api_key?: string; default_model?: string; priority_order?: number }
  ): Promise<{ success: boolean; provider: TenantAIProvider }> => {
    const { data } = await api.put<{ success: boolean; provider: TenantAIProvider }>(`/ai-settings/providers/${providerType}`, providerData);
    return data;
  },
};
