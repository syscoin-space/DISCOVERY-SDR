import { prisma } from '../../../config/prisma';
import { eventBus } from '../../../shared/events/event-bus';
import { DomainEvent, TouchpointCreatedPayload, LeadAssignedPayload } from '../../../shared/events/domain-events';
import { discoveryService } from '../discovery.service';
import { logger } from '../../../config/logger';
import { TouchpointOutcome } from '@prisma/client';

export class DiscoveryHandler {
  register() {
    eventBus.subscribe(DomainEvent.TOUCHPOINT_CREATED, this.handleTouchpointCreated.bind(this));
    eventBus.subscribe(DomainEvent.LEAD_ASSIGNED, this.handleLeadAssigned.bind(this));
  }

  private async handleLeadAssigned(payload: LeadAssignedPayload) {
    const { tenant_id, data } = payload;
    try {
      // Evitar duplicidade se já existir task pendente
      const existing = await prisma.task.findFirst({
        where: { lead_id: data.lead_id, status: 'PENDENTE' }
      });
      if (existing) return;

      await prisma.task.create({
        data: {
          tenant_id,
          lead_id: data.lead_id,
          membership_id: data.sdr_id,
          type: 'DISCOVERY_STEP',
          title: 'Iniciar Discovery',
          description: 'Localizar Decisor (DM) e validar fit operacional.',
          status: 'PENDENTE',
          scheduled_at: new Date()
        }
      });
      logger.info(`[DiscoveryHandler] Created discovery task for lead ${data.lead_id}`);
    } catch (error: any) {
      logger.error(`[DiscoveryHandler] Error creating discovery task`, { error: error.message, tenant_id });
    }
  }

  private async handleTouchpointCreated(payload: TouchpointCreatedPayload) {
    const { tenant_id, data } = payload;
    const { lead_id, outcome, notes } = data;

    try {
      logger.info(`[DiscoveryHandler] Processing touchpoint for lead ${lead_id}`, { 
        tenant_id, 
        outcome 
      });

      await discoveryService.processInteraction(
        lead_id, 
        tenant_id, 
        data.touchpoint_id,
        outcome as TouchpointOutcome, 
        notes
      );
    } catch (error: any) {
      logger.error(`[DiscoveryHandler] Error processing discovery for lead ${lead_id}`, {
        tenant_id,
        error: error.message || error
      });
    }
  }
}

export const discoveryHandler = new DiscoveryHandler();
