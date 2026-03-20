import { Lead } from '@prisma/client';
import { AISuggestion, AIGuidance } from '../ai.service'; // Adjust import later if moved

export interface IAIProvider {
  /**
   * The name of the provider (e.g., OPENROUTER, OPENAI, CLAUDE, GEMINI).
   */
  readonly name: string;

  /**
   * Analyzes discovery notes to suggest outcomes, statuses, and enriched data.
   */
  analyzeDiscovery(leadId: string, tenantId: string, notes: string, apiKey: string, defaultModel: string): Promise<AISuggestion | null>;

  /**
   * Generates a concise summary of the lead history for handoff to a closer.
   */
  generateHandoffSummary(lead: any, apiKey: string, defaultModel: string): Promise<string>;

  /**
   * Provides advanced recommended actions based on the lead's current context.
   */
  getAIGuidance(lead: Lead, apiKey: string, defaultModel: string): Promise<AIGuidance | null>;
}
