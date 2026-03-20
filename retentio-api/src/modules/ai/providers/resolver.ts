import { prisma } from '../../../config/prisma';
import { logger } from '../../../config/logger';
import { IAIProvider } from './ai.interface';
import { OpenRouterProvider } from './openrouter.adapter';
import { OpenAIProvider } from './openai.adapter';
import { AIProviderType } from '@prisma/client';

export class ClaudeProvider implements IAIProvider {
  public readonly name = 'CLAUDE';
  async analyzeDiscovery(leadId: string, tenantId: string, notes: string, apiKey: string, defaultModel: string) { return null; }
  async generateHandoffSummary(lead: any, apiKey: string, defaultModel: string) { return 'Stub'; }
  async getAIGuidance(lead: any, apiKey: string, defaultModel: string) { return null; }
}

export class GeminiProvider implements IAIProvider {
  public readonly name = 'GEMINI';
  async analyzeDiscovery(leadId: string, tenantId: string, notes: string, apiKey: string, defaultModel: string) { return null; }
  async generateHandoffSummary(lead: any, apiKey: string, defaultModel: string) { return 'Stub'; }
  async getAIGuidance(lead: any, apiKey: string, defaultModel: string) { return null; }
}

export class AIProviderResolver {
  private providers: Map<AIProviderType, IAIProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set(AIProviderType.OPENROUTER, new OpenRouterProvider());
    this.providers.set(AIProviderType.OPENAI, new OpenAIProvider());
    this.providers.set(AIProviderType.CLAUDE, new ClaudeProvider());
    this.providers.set(AIProviderType.GEMINI, new GeminiProvider());
  }

  /**
   * Resolves the primary provider for a specific tenant and task.
   */
  async resolve(tenantId: string, taskType: 'DEFAULT' | 'CLASSIFICATION' | 'SUMMARY' | 'GUIDANCE' = 'DEFAULT'): Promise<{ provider: IAIProvider, apiKey: string, defaultModel: string } | null> {
    const settings = await prisma.tenantAISettings.findUnique({ where: { tenant_id: tenantId } });
    
    // If AI is globally disabled for the tenant
    if (settings && !settings.ai_enabled) {
      logger.info(`[AIProviderResolver] AI is disabled for tenant ${tenantId}`);
      return null;
    }

    let targetProviderEnum: AIProviderType = AIProviderType.OPENROUTER; // System default fallback

    // Map task to provider if settings exist (future routing behavior)
    if (settings) {
      if (taskType === 'CLASSIFICATION' && settings.classification_provider) targetProviderEnum = settings.classification_provider;
      else if (taskType === 'SUMMARY' && settings.summary_provider) targetProviderEnum = settings.summary_provider;
      else if (taskType === 'GUIDANCE' && settings.guidance_provider) targetProviderEnum = settings.guidance_provider;
      else if (settings.default_provider) targetProviderEnum = settings.default_provider;
    }

    // Load credentials
    const credential = await prisma.tenantAIProvider.findFirst({
      where: {
        tenant_id: tenantId,
        provider: targetProviderEnum,
        is_enabled: true
      }
    });

    if (!credential || !credential.api_key_encrypted) {
      logger.warn(`[AIProviderResolver] Active API Key missing for provider ${targetProviderEnum} under tenant ${tenantId}`);
      
      // Fallback check
      if (settings?.allow_fallback && settings.fallback_provider) {
        logger.info(`[AIProviderResolver] Falling back to ${settings.fallback_provider}`);
        const fallbackCred = await prisma.tenantAIProvider.findFirst({
          where: { tenant_id: tenantId, provider: settings.fallback_provider, is_enabled: true }
        });
        if (fallbackCred && fallbackCred.api_key_encrypted) {
           return {
             provider: this.providers.get(settings.fallback_provider)!,
             apiKey: this.decrypt(fallbackCred.api_key_encrypted),
             defaultModel: fallbackCred.default_model || ''
           };
        }
      }
      return null; // Fatal: No keys available
    }

    return {
      provider: this.providers.get(targetProviderEnum)!,
      apiKey: this.decrypt(credential.api_key_encrypted),
      defaultModel: credential.default_model || ''
    };
  }

  /**
   * Stub for encryption/decryption module
   */
  private decrypt(hash: string): string {
    // In a real scenario, decrypt AES-256-CBC string here
    return hash; 
  }
}

export const aiProviderResolver = new AIProviderResolver();
