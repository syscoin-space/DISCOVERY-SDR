import { prisma } from '../../config/prisma';
import { DiscoveryStatus, TouchpointOutcome, Lead, TaskStatus } from '@prisma/client';
import { logger } from '../../config/logger';

export class DiscoveryService {
  /**
   * Mapeia o resultado de um contato (Outcome) para um Status de Discovery
   */
  mapOutcomeToDiscoveryStatus(outcome: TouchpointOutcome): DiscoveryStatus | null {
    switch (outcome) {
      case TouchpointOutcome.SPOKE_GATEKEEPER:
      case TouchpointOutcome.GATEKEEPER_CONTACTED:
        return DiscoveryStatus.SEARCHING_DM;
      
      case TouchpointOutcome.DECISION_MAKER_IDENTIFIED:
        return DiscoveryStatus.DM_IDENTIFIED;
      
      case TouchpointOutcome.SPOKE_DECISION_MAKER:
      case TouchpointOutcome.TRANSFERRED_TO_DM:
      case TouchpointOutcome.DIRECT_CONTACT_FOUND:
        return DiscoveryStatus.DM_REACHED;
      
      case TouchpointOutcome.COMPANY_UNREACHABLE:
      case TouchpointOutcome.INVALID_NUMBER:
        return DiscoveryStatus.INSUFFICIENT_DATA;
      
      case TouchpointOutcome.DISCOVERY_COMPLETED:
        return DiscoveryStatus.READY_FOR_PROSPECTING;
      
      default:
        return null;
    }
  }

  /**
   * Calcula o score operacional (0-100) baseado no amadurecimento do lead
   */
  calculateOperationalScore(lead: Partial<Lead>): number {
    let score = (lead.icp_score || 0) * 5; // Base (0-50)

    // Bônus por enriquecimento
    if (lead.dm_name) score += 10;
    if (lead.dm_role) score += 5;
    if (lead.direct_phone || lead.whatsapp) score += 10;
    if (lead.direct_email) score += 10;
    if (lead.preferred_channel) score += 5;

    // Bônus por status de discovery
    switch (lead.discovery_status) {
      case DiscoveryStatus.DM_IDENTIFIED: score += 5; break;
      case DiscoveryStatus.DM_REACHED: score += 10; break;
      case DiscoveryStatus.READY_FOR_PROSPECTING: score += 20; break;
    }

    return Math.min(score, 100);
  }

  /**
   * Sugere a Próxima Melhor Ação (Next Best Action) — Fase 8.4
   */
  async getNextBestAction(lead: Lead): Promise<string> {
    const now = new Date();
    const lastInteraction = lead.updated_at;
    const daysSinceLastInteraction = Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Leads Quentes sem Task Programada
    const pendingTask = await prisma.task.findFirst({
      where: { lead_id: lead.id, status: TaskStatus.PENDENTE }
    });
    if (!pendingTask && lead.operational_score > 70) {
      return '⚠️ ALERTA: Lead quente sem próxima tarefa programada. Programar follow-up imediatamente.';
    }

    // 2. Discovery Travado
    const touchpointCount = await prisma.touchpoint.count({
      where: { lead_id: lead.id }
    });
    if (lead.discovery_status === DiscoveryStatus.SEARCHING_DM && touchpointCount >= 3) {
      return '💡 NBA: Discovery travado no Gatekeeper. Tentar localizar o Decisor via LinkedIn ou busca de contato direto.';
    }

    // 3. Decisor Identificado mas Parado
    if (lead.discovery_status === DiscoveryStatus.DM_IDENTIFIED && daysSinceLastInteraction >= 2) {
      return '🚀 NBA: Decisor já identificado. Iniciar prospecção direta via canal preferencial.';
    }

    // 4. Follow-up Atrasado
    if (daysSinceLastInteraction >= 5 && lead.discovery_status !== DiscoveryStatus.READY_FOR_PROSPECTING) {
      return '🧊 NBA: Lead esfriando. Tentar uma abordagem de "break-up" ou re-engajamento.';
    }

    // 5. Pronto para Prospecção
    if (lead.discovery_status === DiscoveryStatus.READY_FOR_PROSPECTING) {
      return '✅ NBA: Discovery completo. Lead pronto para sequência de prospecção focada em agendamento.';
    }

    return 'Sugerido: Continuar fluxo padrão da cadência.';
  }

  /**
   * Métricas de Discovery e Prospecção — Fase 8.5
   */
  async getDiscoveryMetrics(tenantId: string) {
    const totalLeads = await prisma.lead.count({ where: { tenant_id: tenantId } });
    const discoveryCompleted = await prisma.lead.count({
      where: { tenant_id: tenantId, discovery_status: DiscoveryStatus.READY_FOR_PROSPECTING }
    });

    const totalTouchpoints = await prisma.touchpoint.count({
      where: { lead: { tenant_id: tenantId } }
    });

    const outcomes = await prisma.touchpoint.groupBy({
      by: ['outcome'],
      where: { lead: { tenant_id: tenantId } },
      _count: true
    });

    return {
      total_leads: totalLeads,
      discovery_success_rate: totalLeads > 0 ? (discoveryCompleted / totalLeads) * 100 : 0,
      total_attempts: totalTouchpoints,
      avg_attempts_per_lead: totalLeads > 0 ? totalTouchpoints / totalLeads : 0,
      outcomes_distribution: outcomes.reduce((acc: any, curr) => {
        acc[curr.outcome] = curr._count;
        return acc;
      }, {})
    };
  }

  /**
   * Atualiza o lead com base em uma nova interação
   */
  async processInteraction(leadId: string, tenantId: string, touchpointId: string, outcome: TouchpointOutcome, notes?: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.tenant_id !== tenantId) return;

    // ── Idempotência ───────────────────────────────────────────────────
    if (lead.last_touchpoint_id === touchpointId) {
      logger.info(`[DiscoveryService] Skip idempotent processing for touchpoint ${touchpointId} on lead ${leadId}`);
      return lead;
    }

    const newStatus = this.mapOutcomeToDiscoveryStatus(outcome);
    const updateData: any = {
      last_touchpoint_id: touchpointId
    };

    if (newStatus) {
      // Regra de "Upgrade Only": Não retroceder se já estiver pronto para prospecção, 
      // a menos que seja um erro específico de contato (Wrong Contact / Unreachable)
      if (lead.discovery_status !== DiscoveryStatus.READY_FOR_PROSPECTING || 
          newStatus === DiscoveryStatus.INSUFFICIENT_DATA) {
        updateData.discovery_status = newStatus;
      }
    }

    if (notes) {
      // Evitar duplicar a mesma nota se re-processado
      const noteEntry = `${new Date().toLocaleDateString()}: ${notes}`;
      
      if (!lead.discovery_notes?.includes(noteEntry)) {
        updateData.discovery_notes = lead.discovery_notes 
          ? `${lead.discovery_notes}\n---\n${noteEntry}`
          : noteEntry;
      }
    }

    // Recalcular score operacional com base nos dados mesclados
    const tempLead = { ...lead, ...updateData };
    updateData.operational_score = this.calculateOperationalScore(tempLead);

    logger.info(`[DiscoveryService] Processed discovery enrichment for lead ${leadId}`, {
      tenant_id: tenantId,
      old_status: lead.discovery_status,
      new_status: updateData.discovery_status || lead.discovery_status,
      new_score: updateData.operational_score
    });

    return prisma.lead.update({
      where: { id: leadId },
      data: updateData
    });
  }
}

export const discoveryService = new DiscoveryService();
