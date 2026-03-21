import { SubscriptionStatus } from "@prisma/client";

export enum BillingProviderEnum {
  ASAAS = 'ASAAS',
  STRIPE = 'STRIPE'
}

export interface BillingCustomer {
  externalId: string;
  email: string;
  name: string;
  phone?: string;
  cpfCnpj?: string;
}

export interface BillingSubscription {
  externalId: string;
  externalCustomerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingAt?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  price: number;
  currency: string;
  metadata?: any;
}

export interface CreateSubscriptionInput {
  tenantId: string;
  customerId: string; // ID externo do cliente
  planKey: string;
  paymentMethod: 'CREDIT_CARD' | 'BOLETO' | 'PIX';
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

export interface BillingProvider {
  readonly name: BillingProviderEnum;

  // Clientes
  createCustomer(data: { tenantId: string; email: string; name: string; cpfCnpj?: string }): Promise<BillingCustomer>;
  getCustomer(externalId: string): Promise<BillingCustomer | null>;

  // Assinaturas
  createSubscription(input: CreateSubscriptionInput): Promise<BillingSubscription>;
  getSubscription(externalId: string): Promise<BillingSubscription | null>;
  cancelSubscription(externalId: string): Promise<void>;
  updateSubscription(externalId: string, data: { planKey?: string }): Promise<BillingSubscription>;

  // Webhooks
  handleWebhookPayload(header: string, body: any): Promise<WebhookResult | null>;
}

export interface WebhookResult {
  type: 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'SUBSCRIPTION_DELETED' | 'SUBSCRIPTION_UPDATED';
  externalSubscriptionId: string;
  externalCustomerId?: string;
  status?: SubscriptionStatus;
  metadata?: any;
}
