import { PrismaClient, EmailProviderType } from '@prisma/client';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/types';

const prisma = new PrismaClient();

export type EmailEventPayload = {
  provider: EmailProviderType;
  external_message_id: string;
  provider_event_id?: string;
  type: string;
  email?: string;
  timestamp?: string | Date;
  metadata?: any;
};

export class WebhookService {
  /**
   * Processa um evento recebido de um webhook de e-mail
   */
  async processEvent(payload: EmailEventPayload) {
    const { provider, external_message_id, provider_event_id, type, email, timestamp, metadata } = payload;

    logger.info(`[WebhookService] Processing ${type} event from ${provider} (MsgId: ${external_message_id})`);

    // 1. Localiza a Interação original para resolver o contexto do Tenant e Lead
    // Toda interação enviada na Fase 2 tem o external_id populado
    const interaction = await prisma.interaction.findFirst({
      where: { external_id: external_message_id },
      include: { lead: true }
    });

    if (!interaction) {
      logger.warn(`[WebhookService] Interaction not found for ${provider} message ${external_message_id}. Ignoring event.`);
      // Retornamos sucesso para o provider não ficar dando retry infinito, mas logamos o aviso
      return;
    }

    const tenantId = interaction.tenant_id;

    // 2. Persiste o evento (Idempotência garantida pelo unique no provider + provider_event_id)
    try {
      await prisma.emailEvent.create({
        data: {
          tenant_id: tenantId,
          interaction_id: interaction.id,
          lead_id: interaction.lead_id,
          cadence_step_id: interaction.cadence_step_id,
          provider,
          external_message_id,
          provider_event_id,
          type: type.toLowerCase(),
          email: email || interaction.lead?.email,
          payload: metadata || {},
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        }
      });

      // 3. Atualiza o status da Interação se for relevante (Enriquecimento)
      await this.enrichInteractionStatus(interaction.id, type.toLowerCase());

    } catch (error: any) {
      // Se for erro de P2002 (Unique constraint), ignoramos silenciosamente (idempotência)
      if (error.code === 'P2002') {
        logger.info(`[WebhookService] Duplicate event ${provider_event_id} ignored.`);
        return;
      }
      throw error;
    }
  }

  /**
   * Atualiza o status da interação baseado no novo evento
   */
  private async enrichInteractionStatus(interactionId: string, type: string) {
    let newStatus: string | null = null;

    switch (type) {
      case 'delivered':
      case 'email.delivered':
        newStatus = 'DELIVERED';
        break;
      case 'opened':
      case 'email.opened':
        newStatus = 'OPENED';
        break;
      case 'clicked':
      case 'email.clicked':
        newStatus = 'CLICKED';
        break;
      case 'bounced':
      case 'email.bounced':
        newStatus = 'BOUNCED';
        break;
      case 'complaint':
      case 'email.complaint':
      case 'unsubscribed':
      case 'email.unsubscribed':
        newStatus = 'UNSUBSCRIBED';
        break;
    }

    if (newStatus) {
      await prisma.interaction.update({
        where: { id: interactionId },
        data: { status: newStatus }
      });
    }
  }
}

export const webhookService = new WebhookService();
