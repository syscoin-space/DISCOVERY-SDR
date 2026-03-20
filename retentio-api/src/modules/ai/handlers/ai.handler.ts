import { eventBus } from '../../../shared/events/event-bus';
import { DomainEvent, TouchpointCreatedPayload } from '../../../shared/events/domain-events';
import { aiService } from '../ai.service';
import { logger } from '../../../config/logger';

export class AIHandler {
  register() {
    eventBus.subscribe(DomainEvent.TOUCHPOINT_CREATED, this.handleTouchpointCreated.bind(this));
  }

  private async handleTouchpointCreated(payload: TouchpointCreatedPayload) {
    const { tenant_id, data } = payload;
    const { lead_id, notes } = data;

    if (!notes || notes.trim().length < 5) {
      return; // Ignorar notas vazias ou muito curtas
    }

    try {
      logger.info(`[AIHandler] Triggering AI analysis for lead ${lead_id}`, { 
        tenant_id 
      });

      // Análise assíncrona assistiva
      await aiService.analyzeDiscovery(lead_id, tenant_id, notes);

    } catch (error: any) {
      logger.error(`[AIHandler] Error triggering AI analysis for lead ${lead_id}`, {
        tenant_id,
        error: error.message || error
      });
    }
  }
}

export const aiHandler = new AIHandler();
