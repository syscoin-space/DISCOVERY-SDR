"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { HandoffBriefing, LeadStatus } from "@/lib/types";

const HANDOFF_KEY = "handoffs";

export function useHandoffs() {
  return useQuery<HandoffBriefing[]>({
    queryKey: [HANDOFF_KEY, "list"],
    queryFn: async () => {
      const { data } = await api.get<HandoffBriefing[]>("/handoffs");
      return data;
    },
  });
}

export function useCreateHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { lead_id: string; closer_id?: string; briefing_custom_notes?: string }) => {
      const { data } = await api.post<HandoffBriefing>("/handoffs", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HANDOFF_KEY] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useAcceptHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<HandoffBriefing>(`/handoffs/${id}/accept`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HANDOFF_KEY] });
    },
  });
}

export function useReturnHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, reentry_status }: { id: string; reason: string; reentry_status: LeadStatus }) => {
      const { data } = await api.patch<HandoffBriefing>(`/handoffs/${id}/return`, { reason, reentry_status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HANDOFF_KEY] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
