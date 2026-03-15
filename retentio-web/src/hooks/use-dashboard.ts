"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { DashboardPipeline, SdrMetrics } from "@/lib/types";

export function useDashboardPipeline() {
  return useQuery<DashboardPipeline[]>({
    queryKey: ["dashboard", "pipeline"],
    queryFn: async () => {
      const { data } = await api.get<DashboardPipeline[]>(
        "/dashboard/pipeline"
      );
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useSdrMetrics() {
  return useQuery<SdrMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      const { data } = await api.get<SdrMetrics>("/dashboard/metrics");
      return data;
    },
    refetchInterval: 60_000,
  });
}
