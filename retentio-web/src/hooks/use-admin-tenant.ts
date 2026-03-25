"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { EmailHealthStatus } from "./use-email-health";

export interface AdminTenantProfile {
  summary: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "INACTIVE";
    plan: string;
    plan_key?: string;
    owner_name: string;
    owner_email: string;
    created_at: string;
    onboarding_status: string;
    onboarding_step: number;
  };
  billing: {
    status: string;
    price: number;
    currency: string;
    current_period_end: string | null;
    gateway_customer_id: string | null;
    gateway_subscription_id: string | null;
  };
  product: {
    discovery_enabled: boolean;
    branding_configured: boolean;
    ai_configured: boolean;
    email_configured: boolean;
    email_healthy: boolean;
  };
  team: {
    members_count: number;
    roles_distribution: Record<string, number>;
    pending_invites: number;
    teams_count: number;
  };
  usage_health: {
    total_leads: number;
    last_activity_at: string | null;
    email_health: EmailHealthStatus;
    operational_signal: "NORMAL" | "AT_RISK_NO_ADOPTION" | "BLOCKED_CHANNELS";
  };
}

export function useAdminTenantDetails(tenantId: string) {
  return useQuery<AdminTenantProfile>({
    queryKey: ["admin-tenant-details", tenantId],
    queryFn: async () => {
      const { data } = await api.get<AdminTenantProfile>(`/admin/tenants/${tenantId}`);
      return data;
    },
    enabled: !!tenantId,
  });
}
