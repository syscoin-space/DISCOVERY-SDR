"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";

const EMAIL_HEALTH_KEY = "email-health";

export interface EmailHealthStatus {
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "INACTIVE";
  provider_configured: boolean;
  provider_active: boolean;
  configuration_valid: boolean;
  last_success_at: string | null;
  last_error: {
    message: string;
    at: string;
  } | null;
  failure_count_24h: number;
  blocked_cadences_count: number;
  issues: string[];
}

export function useEmailHealth() {
  return useQuery<EmailHealthStatus>({
    queryKey: [EMAIL_HEALTH_KEY],
    queryFn: async () => {
      const { data } = await api.get<EmailHealthStatus>("/tenant/email-health");
      return data;
    },
    // Refetch slightly more often for health data
    refetchInterval: 30000, 
  });
}
