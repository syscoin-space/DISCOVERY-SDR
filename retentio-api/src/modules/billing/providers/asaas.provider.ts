import axios, { AxiosInstance } from "axios";
import { BillingProvider, BillingCustomer, BillingSubscription, CreateSubscriptionInput, WebhookResult, BillingProviderEnum } from "./billing-provider.interface";
import { SubscriptionStatus } from "@prisma/client";
import { AppError } from "../../../shared/types";
import { env } from "../../../config/env";

export class AsaasProvider implements BillingProvider {
  readonly name = BillingProviderEnum.ASAAS;
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: env.ASAAS_BASE_URL || "https://sandbox.asaas.com/api/v3",
      headers: {
        access_token: env.ASAAS_API_KEY,
      },
    });
  }

  async createCustomer(data: { tenantId: string; email: string; name: string; cpfCnpj?: string }): Promise<BillingCustomer> {
    try {
      const response = await this.api.post("/customers", {
        name: data.name,
        email: data.email,
        cpfCnpj: data.cpfCnpj,
        externalReference: data.tenantId,
      });

      return {
        externalId: response.data.id,
        email: response.data.email,
        name: response.data.name,
      };
    } catch (error: any) {
      console.error("[AsaasProvider] Error creating customer:", error.response?.data || error.message);
      throw new AppError(500, "Erro ao criar cliente no gateway de pagamento", "BILLING_PROVIDER_ERROR");
    }
  }

  async getCustomer(externalId: string): Promise<BillingCustomer | null> {
    try {
      const response = await this.api.get(`/customers/${externalId}`);
      return {
        externalId: response.data.id,
        email: response.data.email,
        name: response.data.name,
      };
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<BillingSubscription> {
    // No Asaas, a assinatura é criada com ciclo mensal por padrão aqui
    // Precisaríamos mapear o planKey para o valor e especificações
    try {
      // Simulação simplificada por enquanto, precisará de lógica de planos
      const response = await this.api.post("/subscriptions", {
        customer: input.customerId,
        billingType: input.paymentMethod,
        value: 490, // Placeholder, deve vir do plano
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cycle: "MONTHLY",
        externalReference: input.tenantId,
      });

      return this.mapSubscription(response.data);
    } catch (error: any) {
      console.error("[AsaasProvider] Error creating subscription:", error.response?.data || error.message);
      throw new AppError(500, "Erro ao criar assinatura no gateway", "BILLING_PROVIDER_ERROR");
    }
  }

  async getSubscription(externalId: string): Promise<BillingSubscription | null> {
    try {
      const response = await this.api.get(`/subscriptions/${externalId}`);
      return this.mapSubscription(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async cancelSubscription(externalId: string): Promise<void> {
    await this.api.delete(`/subscriptions/${externalId}`);
  }

  async updateSubscription(externalId: string, data: { planKey?: string }): Promise<BillingSubscription> {
    // No Asaas, atualizamos o valor da assinatura
    const response = await this.api.post(`/subscriptions/${externalId}`, {
      // Logic for changing value/plan
    });
    return this.mapSubscription(response.data);
  }

  async handleWebhookPayload(header: string, body: any): Promise<WebhookResult | null> {
    // Validação de token do Asaas deve ser feita aqui se necessário
    const event = body.event;
    
    switch (event) {
      case 'PAYMENT_RECEIVED':
        return {
          type: 'PAYMENT_RECEIVED',
          externalSubscriptionId: body.payment.subscription,
          externalCustomerId: body.payment.customer,
          status: SubscriptionStatus.ACTIVE,
        };
      case 'PAYMENT_OVERDUE':
        return {
          type: 'PAYMENT_OVERDUE',
          externalSubscriptionId: body.payment.subscription,
          status: SubscriptionStatus.PAST_DUE,
        };
      case 'SUBSCRIPTION_DELETED':
        return {
          type: 'SUBSCRIPTION_DELETED',
          externalSubscriptionId: body.subscription.id,
          status: SubscriptionStatus.CANCELED,
        };
      default:
        return null;
    }
  }

  private mapSubscription(data: any): BillingSubscription {
    return {
      externalId: data.id,
      externalCustomerId: data.customer,
      planId: data.plan_id || "placeholder", // Mapping needed
      status: this.mapStatus(data.status),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(data.nextDueDate),
      price: data.value,
      currency: "BRL",
      cancelAtPeriodEnd: false,
    };
  }

  private mapStatus(asaasStatus: string): SubscriptionStatus {
    switch (asaasStatus) {
      case 'ACTIVE': return SubscriptionStatus.ACTIVE;
      case 'EXPIRED': return SubscriptionStatus.CANCELED;
      case 'OVERDUE': return SubscriptionStatus.PAST_DUE;
      default: return SubscriptionStatus.ACTIVE;
    }
  }
}

export const asaasProvider = new AsaasProvider();
