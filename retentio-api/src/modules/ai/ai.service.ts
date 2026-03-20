import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { DiscoveryStatus, Lead, TouchpointOutcome } from '@prisma/client';
import { aiProviderResolver } from './providers/resolver';

export interface AISuggestion {
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  suggested_outcome?: TouchpointOutcome;
  suggested_status?: DiscoveryStatus;
  intent_classification?: string;
  readiness_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  enrichment_data?: {
    dm_name?: string;
    dm_role?: string;
    direct_phone?: string;
    direct_email?: string;
    preferred_channel?: string;
  };
  summary: string;
  confidence: number; // 0 to 1
}

export interface AIGuidance {
  nba: string;
  reasoning: string;
  suggested_approach: string;
  potential_objections: string[];
}

export class AIService {
  
  /**
   * Analisa notas de discovery e sugere outcomes e enriquecimento via Adapter Resolvido
   */
  async analyzeDiscovery(leadId: string, tenantId: string, notes: string): Promise<AISuggestion | null> {
    logger.info(`[AIService] Analyzing discovery notes for lead ${leadId}`, { tenant_id: tenantId });

    const fallbackSuggestion: AISuggestion = {
      status: 'PENDING',
      summary: 'Análise automática indisponível.',
      confidence: 0.0
    };

    const resolution = await aiProviderResolver.resolve(tenantId, 'CLASSIFICATION');
    let suggestion = fallbackSuggestion;

    if (resolution) {
      const { provider, apiKey, defaultModel } = resolution;
      logger.info(`[AIService] Using ${provider.name} for discovery analysis`);
      
      const result = await provider.analyzeDiscovery(leadId, tenantId, notes, apiKey, defaultModel);
      if (result) suggestion = result;
    }

    // Persistir sugestão no lead (Transient Metadata)
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ai_metadata: {
          last_suggestion: suggestion,
          analyzed_at: new Date().toISOString()
        } as any
      }
    });

    return suggestion;
  }

  /**
   * Gera um resumo para Handoff SDR -> Closer via Adapter Resolvido
   */
  async generateHandoffSummary(leadId: string, tenantId: string): Promise<string> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenant_id: tenantId },
      include: { 
        touchpoints: { take: 10, orderBy: { created_at: 'desc' } }
      }
    });

    if (!lead) return 'Lead não encontrado para resumo.';

    const resolution = await aiProviderResolver.resolve(tenantId, 'SUMMARY');
    if (!resolution) {
      return `Resumo indisponível via IA.\n\nContexto Básico: Status ${lead.discovery_status}, Decisor: ${lead.dm_name || 'N/A'}`;
    }

    const { provider, apiKey, defaultModel } = resolution;
    return provider.generateHandoffSummary(lead, apiKey, defaultModel);
  }

  /**
   * Fornece Orientação Assistida para Próxima Ação via Adapter Resolvido
   */
  async getAIGuidance(lead: Lead): Promise<AIGuidance> {
    const fallbackGuidance: AIGuidance = {
      nba: 'Continuar fluxo de prospecção.',
      reasoning: 'O lead está em um estágio inicial.',
      suggested_approach: 'Utilize abordagem padrão.',
      potential_objections: ['Falta de orçamento']
    };

    const resolution = await aiProviderResolver.resolve(lead.tenant_id, 'GUIDANCE');
    if (!resolution) return fallbackGuidance;

    const { provider, apiKey, defaultModel } = resolution;
    const result = await provider.getAIGuidance(lead, apiKey, defaultModel);
    
    return result || fallbackGuidance;
  }
}

export const aiService = new AIService();

