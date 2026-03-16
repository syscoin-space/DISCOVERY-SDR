"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/types";

export function useTouchpoints(leadId: string | undefined) {
  return useQuery<any[]>({
    queryKey: ["touchpoints", leadId],
    queryFn: async () => {
      const { data } = await api.get<any[]>(`/leads/${leadId}/touchpoints`);
      return data;
    },
    enabled: !!leadId,
  });
}

export function useCreateTouchpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, payload }: { leadId: string; payload: any }) => {
      const { data } = await api.post(`/leads/${leadId}/touchpoints`, payload);
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["touchpoints", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
    },
  });
}

export function useJourneySummary(leadId: string | undefined) {
  return useQuery<any>({
    queryKey: ["journey-summary", leadId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${leadId}/journey-summary`);
      return data;
    },
    enabled: !!leadId,
  });
}
