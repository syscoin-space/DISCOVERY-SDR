import { Lead } from '@prisma/client';
import { IAIProvider } from './ai.interface';
import { AISuggestion, AIGuidance } from '../ai.service';
import { openRouterClient } from '../../../shared/libs/openrouter.client';
import { AI_PROMPTS } from '../ai.prompts';
import { logger } from '../../../config/logger';

export class OpenRouterProvider implements IAIProvider {
  public readonly name = 'OPENROUTER';

  async analyzeDiscovery(leadId: string, tenantId: string, notes: string, apiKey: string, defaultModel: string): Promise<AISuggestion | null> {
    const response = await openRouterClient.createCompletion([
      { role: 'system', content: AI_PROMPTS.DISCOVERY_ANALYSIS },
      { role: 'user', content: `Analise as seguintes notas de discovery: "${notes}"` }
    ], { 
      model: defaultModel, 
      response_format: { type: 'json_object' } 
    }, apiKey);

    if (!response) return null;

    try {
      return JSON.parse(response) as AISuggestion;
    } catch (e) {
      logger.error('[OpenRouterProvider] Failed to parse JSON', { response });
      return null;
    }
  }

  async generateHandoffSummary(lead: any, apiKey: string, defaultModel: string): Promise<string> {
    const context = `
      Empresa: ${lead.company_name}
      Status: ${lead.discovery_status}
      Decisor: ${lead.dm_name || 'N/A'} (${lead.dm_role || 'N/A'})
      Notas Gerais: ${lead.notes || 'N/A'}
      
      Histórico Recente de Interações:
      ${lead.touchpoints?.map((tp: any) => `- [${tp.outcome}] ${tp.notes || 'Sem nota'}`).join('\n')}
    `;

    const response = await openRouterClient.createCompletion([
      { role: 'system', content: AI_PROMPTS.HANDOFF_SUMMARY },
      { role: 'user', content: `Gere o sumário de handoff para este contexto:\n${context}` }
    ], { model: defaultModel }, apiKey);

    return response || `Resumo indisponível via IA.\n\nContexto Básico: Status ${lead.discovery_status}, Decisor: ${lead.dm_name || 'N/A'}`;
  }

  async getAIGuidance(lead: Lead, apiKey: string, defaultModel: string): Promise<AIGuidance | null> {
    const context = `
      Status Atual: ${lead.discovery_status}
      Score ICP: ${lead.icp_score}/10
      Score Operacional (Prontidão): ${lead.operational_score}/100
      Decisor Identificado: ${lead.dm_name ? 'Sim' : 'Não'}
      Notas de Discovery Anteriores: ${lead.discovery_notes || 'Nenhuma'}
    `;

    const response = await openRouterClient.createCompletion([
      { role: 'system', content: AI_PROMPTS.GUIDANCE_NBA },
      { role: 'user', content: `Baseado no contexto deste lead, sugira a próxima melhor ação (Assistive NBA):\n${context}` }
    ], { 
      model: defaultModel,
      response_format: { type: 'json_object' } 
    }, apiKey);

    if (!response) return null;

    try {
      return JSON.parse(response) as AIGuidance;
    } catch (e) {
      logger.error('[OpenRouterProvider] Failed to parse JSON guidance', { response });
      return null;
    }
  }
}
