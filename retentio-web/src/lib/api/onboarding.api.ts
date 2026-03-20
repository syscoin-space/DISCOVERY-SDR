import api from "./client";

export interface OnboardingState {
  tenant_id: string;
  tasks_completed: {
    company_setup: boolean;
    team_added: boolean;
    ai_setup: boolean;
  };
  completed_at: string | null;
  tenant: {
    name: string;
    onboarding_status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    onboarding_step: number;
    branding?: any;
  };
}

export const onboardingApi = {
  getOnboardingState: async (): Promise<OnboardingState> => {
    const { data } = await api.get("/onboarding/state");
    return data;
  },

  updateCompany: async (name: string, branding?: any) => {
    const { data } = await api.patch("/onboarding/company", { name, branding });
    return data;
  },

  setupTeam: async (members: Array<{ email: string; name: string; role: string }>) => {
    const { data } = await api.post("/onboarding/team", { members });
    return data;
  },

  setupAI: async (provider: string, apiKey: string) => {
    const { data } = await api.patch("/onboarding/ai", { provider, api_key: apiKey });
    return data;
  },

  completeOnboarding: async () => {
    const { data } = await api.post("/onboarding/complete");
    return data;
  },

  getActivationSummary: async (): Promise<Record<string, boolean>> => {
    const { data } = await api.get("/onboarding/activation-summary");
    return data;
  },
};
