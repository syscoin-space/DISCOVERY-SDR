import { eventBus } from '../../../shared/events/event-bus';
import { 
  DomainEvent, 
  LeadAssignedPayload, 
  HandoffCreatedPayload 
} from '../../../shared/events/domain-events';
import { notificationService } from '../notification.service';
import { logger } from '../../../config/logger';

export class NotificationHandler {
  register() {
    eventBus.subscribe(DomainEvent.LEAD_ASSIGNED, this.handleLeadAssigned.bind(this));
    eventBus.subscribe(DomainEvent.HANDOFF_CREATED, this.handleHandoffCreated.bind(this));
    eventBus.subscribe(DomainEvent.HANDOFF_ACCEPTED, this.handleHandoffAccepted.bind(this));
    eventBus.subscribe(DomainEvent.HANDOFF_RETURNED, this.handleHandoffReturned.bind(this));
  }

  private async handleLeadAssigned(payload: LeadAssignedPayload) {
    const { tenant_id, data } = payload;
    try {
      const existing = await notificationService.findRecentNotification(data.sdr_id, 'LEAD', data.lead_id);
      if (existing) return;

      await notificationService.createNotification({
        tenant_id,
        user_id: data.sdr_id,
        title: 'Novo Lead Atribuído',
        body: `Você recebeu o lead: ${data.lead_name}`,
        category: 'LEAD',
        link: `/leads/${data.lead_id}`,
        lead_id: data.lead_id
      });
    } catch (error: any) {
      logger.error(`[NotificationHandler] Error in handleLeadAssigned`, { error: error.message, tenant_id });
    }
  }

  private async handleHandoffCreated(payload: HandoffCreatedPayload) {
    const { tenant_id, data } = payload;
    try {
      const existing = await notificationService.findRecentNotification(data.closer_id, 'HANDOFF', data.lead_id);
      if (existing) return;

      await notificationService.createNotification({
        tenant_id,
        user_id: data.closer_id,
        title: 'Novo Handoff Recebido',
        body: `O SDR ${data.sdr_name} enviou um novo handoff para o lead ${data.lead_name}`,
        category: 'HANDOFF',
        link: `/handoffs/${data.handoff_id}`,
        lead_id: data.lead_id
      });
    } catch (error: any) {
      logger.error(`[NotificationHandler] Error in handleHandoffCreated`, { error: error.message, tenant_id });
    }
  }

  private async handleHandoffAccepted(payload: any) {
    const { tenant_id, data } = payload;
    try {
      await notificationService.createNotification({
        tenant_id,
        user_id: data.sdr_id,
        title: 'Handoff Aceito',
        body: `Seu handoff para o lead ${data.lead_name} foi aceito pelo Closer.`,
        category: 'HANDOFF',
        link: `/leads/${data.lead_id}`,
        lead_id: data.lead_id
      });
    } catch (error: any) {
      logger.error(`[NotificationHandler] Error in handleHandoffAccepted`, { error: error.message, tenant_id });
    }
  }

  private async handleHandoffReturned(payload: any) {
    const { tenant_id, data } = payload;
    try {
      await notificationService.createNotification({
        tenant_id,
        user_id: data.sdr_id,
        title: 'Handoff Devolvido',
        body: `Seu handoff para o lead ${data.lead_name} foi devolvido. Motivo: ${data.reason}`,
        category: 'HANDOFF',
        link: `/leads/${data.lead_id}`,
        lead_id: data.lead_id
      });
    } catch (error: any) {
      logger.error(`[NotificationHandler] Error in handleHandoffReturned`, { error: error.message, tenant_id });
    }
  }
}

export const notificationHandler = new NotificationHandler();
