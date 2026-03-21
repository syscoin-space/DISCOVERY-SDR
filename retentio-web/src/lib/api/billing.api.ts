import api from "./client";

export interface PlanUsage {
  plan: PlanDetails | null;
  status: string;
  current_period_end: string | null;
  next_billing_at: string | null;
  gateway_subscription_id: string | null;
  usage: {
    sdr: number;
    closer: number;
    leads_monthly: number;
  };
}

export interface PlanDetails {
  id: string;
  name: string;
  key: string;
  description: string | null;
  price_monthly: number | null;
  currency: string;
  limits: any;
  features: any;
  is_active: boolean;
}

export const billingApi = {
  getCurrentPlan: async (): Promise<PlanUsage> => {
    const { data } = await api.get("/billing/plan");
    return data;
  },

  async getPlans(): Promise<PlanDetails[]> {
    const response = await api.get('/billing/plans');
    return response.data;
  },

  async createSubscription(planKey: string, paymentMethod: any) {
    const response = await api.post('/billing/subscribe', { planKey, paymentMethod });
    return response.data;
  }
};

export const invitationApi = {
  async sendInvite(email: string, role: string, teamId?: string) {
    const response = await api.post('/api/invitations', { email, role, teamId });
    return response.data;
  },

  async acceptInvite(token: string) {
    const response = await api.post('/api/invitations/accept', { token });
    return response.data;
  }
};
