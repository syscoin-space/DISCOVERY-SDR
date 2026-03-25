import { prisma } from '../../config/prisma';
import { InteractionType, EmailProviderType } from '@prisma/client';

export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  lastActivityAt?: Date;
}

export class EmailMetricsService {
  /**
   * Métricas Globais do Tenant
   */
  async getTenantMetrics(tenantId: string): Promise<EmailMetrics> {
    const [sent, events] = await Promise.all([
      // Total de e-mails disparados (Interações do tipo EMAIL)
      prisma.interaction.count({
        where: { tenant_id: tenantId, type: InteractionType.EMAIL }
      }),
      // Contagem por tipo de evento
      prisma.emailEvent.groupBy({
        by: ['type'],
        where: { tenant_id: tenantId },
        _count: { id: true },
        _max: { created_at: true }
      })
    ]);

    return this.calculateRates(sent, events);
  }

  /**
   * Métricas de uma Cadência Específica
   */
  async getCadenceMetrics(tenantId: string, cadenceId: string): Promise<EmailMetrics> {
    const [sent, events] = await Promise.all([
      // Total de e-mails disparados NESTA cadência
      prisma.interaction.count({
        where: { 
          tenant_id: tenantId, 
          type: InteractionType.EMAIL,
          cadence_step: { cadence_id: cadenceId }
        }
      }),
      // Contagem por tipo de evento NESTA cadência
      prisma.emailEvent.groupBy({
        by: ['type'],
        where: { 
          tenant_id: tenantId,
          interaction: { cadence_step: { cadence_id: cadenceId } }
        },
        _count: { id: true },
        _max: { created_at: true }
      })
    ]);

    return this.calculateRates(sent, events);
  }

  /**
   * Lógica comum de cálculo de taxas
   */
  private calculateRates(sent: number, events: any[]): EmailMetrics {
    const counts = {
      delivered: 0,
      opened: 0,
      clicked: 0,
    };

    let lastActivity: Date | undefined;

    events.forEach(e => {
      if (e.type === 'email.delivered' || e.type === 'delivered') counts.delivered += r_count(e);
      if (e.type === 'email.opened' || e.type === 'opened') counts.opened += r_count(e);
      if (e.type === 'email.clicked' || e.type === 'clicked') counts.clicked += r_count(e);
      
      const eventTime = e._max.created_at;
      if (eventTime && (!lastActivity || eventTime > lastActivity)) {
        lastActivity = eventTime;
      }
    });

    function r_count(e: any) { return e._count.id; }

    return {
      totalSent: sent,
      totalDelivered: counts.delivered,
      totalOpened: counts.opened,
      totalClicked: counts.clicked,
      deliveryRate: sent > 0 ? (counts.delivered / sent) * 100 : 0,
      openRate: counts.delivered > 0 ? (counts.opened / counts.delivered) * 100 : 0,
      clickRate: counts.delivered > 0 ? (counts.clicked / counts.delivered) * 100 : 0,
      lastActivityAt: lastActivity
    };
  }

  /**
   * Lista performance de todas as cadências do tenant
   */
  async listCadencePerformance(tenantId: string) {
    const cadences = await prisma.cadence.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true, purpose: true }
    });

    const performance = await Promise.all(
      cadences.map(async (c) => ({
        id: c.id,
        name: c.name,
        purpose: c.purpose,
        metrics: await this.getCadenceMetrics(tenantId, c.id)
      }))
    );

    return performance;
  }
}

export const emailMetricsService = new EmailMetricsService();
