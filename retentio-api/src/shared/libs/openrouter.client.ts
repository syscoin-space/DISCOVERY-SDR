import { logger } from '../../config/logger';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenRouterClient {
  private apiKey: string;
  private defaultModel: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    // Recomendação V2 para parsing estruturado:
    this.defaultModel = process.env.OPENROUTER_MODEL_ID || 'openai/gpt-4o-mini';
  }

  async createCompletion(
    messages: OpenRouterMessage[],
    options?: { model?: string; temperature?: number; response_format?: { type: 'json_object' } },
    tenantApiKey?: string,
    timeoutMs = 15000 // 15s default timeout
  ): Promise<string | null> {
    const activeKey = tenantApiKey || this.apiKey;
    if (!activeKey) {
      logger.warn('[OpenRouterClient] OPENROUTER_API_KEY is missing. AI features will fallback to null.');
      return null;
    }

    const payload = {
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.0, // Low temp for deterministic/operational outputs
      response_format: options?.response_format,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeKey}`,
          'HTTP-Referer': 'https://retentio.ai',
          'X-Title': 'Discovery SDR V2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error text');
        logger.error(`[OpenRouterClient] External API error: ${response.status} ${response.statusText}`, { payload, error: errText });
        return null;
      }

      const data = (await response.json()) as OpenRouterResponse;
      if (!data.choices || data.choices.length === 0) {
        logger.error('[OpenRouterClient] Invalid response format from OpenRouter', { data });
        return null;
      }

      return data.choices[0].message.content;

    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        logger.error('[OpenRouterClient] Request timed out completely after ' + timeoutMs + 'ms');
      } else {
        logger.error('[OpenRouterClient] Exception during fetch', { error: error.message || error });
      }
      return null;
    }
  }
}

export const openRouterClient = new OpenRouterClient();
