import { Lead } from '@prisma/client';
import { IAIProvider } from './ai.interface';
import { AISuggestion, AIGuidance } from '../ai.service';
import { logger } from '../../../config/logger';

export class OpenAIProvider implements IAIProvider {
  public readonly name = 'OPENAI';

  async analyzeDiscovery(leadId: string, tenantId: string, notes: string, apiKey: string, defaultModel: string): Promise<AISuggestion | null> {
    logger.warn(`[OpenAIProvider] Not fully implemented. Ready for native SDK integration. Using fake fallback.`);
    return null;
  }

  async generateHandoffSummary(lead: any, apiKey: string, defaultModel: string): Promise<string> {
    logger.warn(`[OpenAIProvider] Not fully implemented. Ready for native SDK integration. Using fake fallback.`);
    return `Resumo indisponível via IA (OpenAI Stub).\n\nContexto Básico: Status ${lead.discovery_status}, Decisor: ${lead.dm_name || 'N/A'}`;
  }

  async getAIGuidance(lead: Lead, apiKey: string, defaultModel: string): Promise<AIGuidance | null> {
    logger.warn(`[OpenAIProvider] Not fully implemented. Ready for native SDK integration. Using fake fallback.`);
    return null;
  }
}
