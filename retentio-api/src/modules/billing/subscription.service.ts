import { prisma } from "../../config/prisma";
import { asaasProvider } from "./providers/asaas.provider";
import { BillingProvider } from "./providers/billing-provider.interface";
import { AppError } from "../../shared/types";
import { SubscriptionStatus } from "@prisma/client";

export class SubscriptionService {
  private provider: BillingProvider = asaasProvider; // Por enquanto fixo no Asaas

  /**
   * Garante que o tenant tenha um cliente no gateway
   */
  async ensureCustomer(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { memberships: { where: { role: 'OWNER' }, include: { user: true } } }
    });

    if (!tenant) throw new AppError(404, "Tenant não encontrado", "TENANT_NOT_FOUND");
    
    // Se já tiver sub com customer ID, retorna
    const sub = await prisma.subscription.findUnique({ where: { tenant_id: tenantId } });
    if (sub?.gateway_customer_id) return sub.gateway_customer_id;

    const owner = tenant.memberships[0]?.user;
    if (!owner) throw new AppError(400, "Tenant sem proprietário configurado", "OWNER_NOT_FOUND");

    const customer = await this.provider.createCustomer({
      tenantId: tenant.id,
      name: tenant.name,
      email: owner.email,
    });

    // Atualiza ou cria a sub inicial
    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { gateway_customer_id: customer.externalId }
      });
    } else {
      // Busca plano padrão (ex: STANDARD)
      const plan = await prisma.plan.findUnique({ where: { key: 'STANDARD' } });
      await prisma.subscription.create({
        data: {
          tenant_id: tenant.id,
          plan_id: plan!.id,
          gateway_customer_id: customer.externalId,
          status: SubscriptionStatus.TRIAL
        }
      });
    }

    return customer.externalId;
  }

  /**
   * Cria uma assinatura real no provider
   */
  async createSubscription(tenantId: string, planKey: string, paymentMethod: any) {
    const customerId = await this.ensureCustomer(tenantId);
    
    const billingSub = await this.provider.createSubscription({
      tenantId,
      customerId,
      planKey,
      paymentMethod
    });

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });

    return prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: {
        plan_id: plan!.id,
        gateway_subscription_id: billingSub.externalId,
        status: billingSub.status,
        current_period_start: billingSub.currentPeriodStart,
        current_period_end: billingSub.currentPeriodEnd,
        price: billingSub.price,
        currency: billingSub.currency,
        metadata: billingSub.metadata
      }
    });
  }

  /**
   * Processa o webhook do provider
   */
  async handleWebhook(body: any) {
    const result = await this.provider.handleWebhookPayload("", body);
    if (!result) return;

    const { externalSubscriptionId, status, metadata } = result;

    const sub = await prisma.subscription.findFirst({
      where: { gateway_subscription_id: externalSubscriptionId }
    });

    if (!sub) return;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: status || sub.status,
        last_webhook_at: new Date(),
        metadata: metadata ? { ...(sub.metadata as any), ...metadata } : sub.metadata
      }
    });
  }

  async getCustomerPortal(tenantId: string) {
    const sub = await prisma.subscription.findUnique({ where: { tenant_id: tenantId } });
    if (!sub || !sub.gateway_customer_id) {
      throw new AppError(404, "Cliente não possui integração financeira ativa", "NO_GATEWAY_CUSTOMER");
    }

    const url = await this.provider.getCustomerPortalUrl(sub.gateway_customer_id);
    return { url };
  }
}

export const subscriptionService = new SubscriptionService();
