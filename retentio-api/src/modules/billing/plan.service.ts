import { PrismaClient } from "@prisma/client";
import { AppError } from "../../shared/types";

const prisma = new PrismaClient();

export interface PlanLimits {
  sdr: number;
  closer: number;
  leads_monthly: number;
  [key: string]: any;
}

export class PlanService {
  /**
   * Obtém o plano atual e a assinatura do tenant
   */
  async getTenantPlan(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        subscription: true
      }
    });

    if (!tenant || !tenant.plan) {
      return null;
    }

    return {
      plan: tenant.plan,
      subscription: tenant.subscription,
      limits: tenant.plan.limits as unknown as PlanLimits,
      features: tenant.plan.features as any
    };
  }

  /**
   * Verifica se um limite específico foi atingido
   */
  async checkLimit(tenantId: string, resource: keyof PlanLimits) {
    const { limits } = await this.getTenantPlan(tenantId);
    const limit = limits[resource];

    if (limit === undefined) return true; // Sem limite definido

    const usage = await this.getResourceUsage(tenantId, resource);

    if (usage >= limit) {
      throw new AppError(403, `Limite de ${resource} atingido (${usage}/${limit}). Faça upgrade do seu plano.`, "LIMIT_REACHED");
    }

    return true;
  }

  /**
   * Obtém o uso atual de um recurso
   */
  async getResourceUsage(tenantId: string, resource: keyof PlanLimits): Promise<number> {
    switch (resource) {
      case 'sdr':
        return prisma.membership.count({
          where: { tenant_id: tenantId, role: 'SDR', active: true }
        });
      case 'closer':
        return prisma.membership.count({
          where: { tenant_id: tenantId, role: 'CLOSER', active: true }
        });
      case 'leads_monthly': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        return prisma.lead.count({
          where: { 
            tenant_id: tenantId,
            created_at: { gte: startOfMonth }
          }
        });
      }
      default:
        return 0;
    }
  }

  /**
   * Retorna um resumo de uso para o Dashboard/Configurações
   */
  async getUsageSummary(tenantId: string) {
    const planInfo = await this.getTenantPlan(tenantId);
    
    const usage = {
      sdr: await this.getResourceUsage(tenantId, 'sdr'),
      closer: await this.getResourceUsage(tenantId, 'closer'),
      leads_monthly: await this.getResourceUsage(tenantId, 'leads_monthly'),
    };

    if (!planInfo) {
      return {
        plan_name: 'Nenhum',
        plan_key: 'none',
        limits: { sdr: 0, closer: 0, leads_monthly: 0 },
        usage
      };
    }

    return {
      plan_name: planInfo.plan.name,
      plan_key: planInfo.plan.key,
      limits: planInfo.limits,
      usage
    };
  }
}

export const planService = new PlanService();
