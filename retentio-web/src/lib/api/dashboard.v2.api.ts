"use client";

import { useQuery } from '@tanstack/react-query';
import api from './client';
import { LeadStatus } from '../types';

export interface OperationalMetrics {
  total_leads: number;
  qualified_leads: number;
  pipeline_distribution: Record<LeadStatus, number>;
  conversion_rate: number;
  recent_handoffs: number;
  task_completion_rate: number;
}

export interface DiscoveryMetrics {
  leads_with_dm: number;
  discovery_completion_rate: number;
  outcomes_distribution: Record<string, number>;
}

export interface AIHilMetrics {
  total_interactions: number;
  accepted_clean: number;
  edited_then_accepted: number;
  rejected: number;
  adoption_rate: number;
}

export interface DashboardV2Response {
  operational: OperationalMetrics;
  discovery: DiscoveryMetrics;
  ai_hil: AIHilMetrics;
}

export function useDashboardV2Metrics() {
  return useQuery<DashboardV2Response>({
    queryKey: ['dashboard-v2-metrics'],
    queryFn: async () => {
      const { data } = await api.get<DashboardV2Response>('/dashboard/v2/metrics');
      return data;
    },
    staleTime: 60000, // Cache de 1 minuto
  });
}
