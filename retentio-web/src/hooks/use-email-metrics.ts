"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";

const EMAIL_METRICS_KEY = "email-metrics";

export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  lastActivityAt?: string;
}

export interface CadencePerformance {
  id: string;
  name: string;
  purpose: string;
  metrics: EmailMetrics;
}

export function useEmailMetrics() {
  return useQuery<EmailMetrics>({
    queryKey: [EMAIL_METRICS_KEY, "global"],
    queryFn: async () => {
      const { data } = await api.get<EmailMetrics>("/tenant/email-metrics");
      return data;
    },
  });
}

export function useCadencePerformance() {
  return useQuery<CadencePerformance[]>({
    queryKey: [EMAIL_METRICS_KEY, "cadences"],
    queryFn: async () => {
      const { data } = await api.get<CadencePerformance[]>("/tenant/email-metrics/cadences");
      return data;
    },
  });
}

export function useSpecificCadenceMetrics(cadenceId: string | undefined) {
  return useQuery<EmailMetrics>({
    queryKey: [EMAIL_METRICS_KEY, cadenceId],
    queryFn: async () => {
      const { data } = await api.get<EmailMetrics>(`/tenant/email-metrics/cadences/${cadenceId}`);
      return data;
    },
    enabled: !!cadenceId,
  });
}
