"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Lead, LeadStatus, PaginatedResponse, Interaction, DiscoveredStack } from "@/lib/types";

const LEADS_KEY = "leads";

interface LeadsFilters {
  status?: LeadStatus;
  score_tier?: string;
  icp_tier?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export function useLeads(filters: LeadsFilters = {}) {
  return useQuery<PaginatedResponse<Lead>>({
    queryKey: [LEADS_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.score_tier) params.set("score_tier", filters.score_tier);
      if (filters.icp_tier) params.set("icp_tier", filters.icp_tier);
      if (filters.search) params.set("search", filters.search);
      if (filters.cursor) params.set("cursor", filters.cursor);
      if (filters.limit) params.set("limit", String(filters.limit));

      const { data } = await api.get<PaginatedResponse<Lead>>(
        `/leads?${params.toString()}`
      );
      return data;
    },
  });
}

export function useLead(leadId: string | undefined) {
  return useQuery<Lead>({
    queryKey: [LEADS_KEY, leadId],
    queryFn: async () => {
      const { data } = await api.get<Lead>(`/leads/${leadId}`);
      return data;
    },
    enabled: !!leadId,
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      status,
    }: {
      leadId: string;
      status: LeadStatus;
    }) => {
      const { data } = await api.patch(`/leads/${leadId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Lead>) => {
      const { data } = await api.post<Lead>("/leads", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

export function useAllLeads(sdrId?: string) {
  return useQuery<Lead[]>({
    queryKey: [LEADS_KEY, "all", sdrId],
    queryFn: async () => {
      const url = sdrId ? `/leads?limit=500&sdr_id=${sdrId}` : "/leads?limit=500";
      const { data } = await api.get<PaginatedResponse<Lead>>(url);
      return data.data;
    },
  });
}

export function useInteractions(leadId: string | undefined) {
  return useQuery<{ items: Interaction[]; next_cursor: string | null; count: number }>({
    queryKey: ["interactions", leadId],
    queryFn: async () => {
      const { data } = await api.get<{ items: Interaction[]; next_cursor: string | null; count: number }>(
        `/leads/${leadId}/interactions`
      );
      return data;
    },
    enabled: !!leadId,
  });
}

export interface LeadHistoryLog {
  id: string;
  action: string;
  old_value: any;
  new_value: any;
  created_at: string;
  user: {
    name: string;
    avatar_url: string | null;
  } | null;
}

export function useLeadHistory(leadId: string | undefined) {
  return useQuery<LeadHistoryLog[]>({
    queryKey: ["lead-history", leadId],
    queryFn: async () => {
      const { data } = await api.get<LeadHistoryLog[]>(`/leads/${leadId}/history`);
      return data;
    },
    enabled: !!leadId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: { type: string; body: string };
    }) => {
      const { data } = await api.post(`/leads/${leadId}/interactions`, payload);
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["interactions", leadId] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, leadId] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: Partial<Lead>;
    }) => {
      const { data } = await api.patch<Lead>(`/leads/${leadId}`, payload);
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, leadId] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

// ─── Discovered Stack (Tech/Plataformas) ────────────────────────────

export function useLeadStack(leadId: string | undefined) {
  return useQuery<DiscoveredStack[]>({
    queryKey: ["stack", leadId],
    queryFn: async () => {
      const { data } = await api.get<DiscoveredStack[]>(`/leads/${leadId}/stack`);
      return data;
    },
    enabled: !!leadId,
  });
}

export function useAddToStack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      category,
      tool_name,
    }: {
      leadId: string;
      category: string;
      tool_name: string;
    }) => {
      const { data } = await api.post<DiscoveredStack>(`/leads/${leadId}/stack`, { category, tool_name });
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["stack", leadId] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, leadId] });
    },
  });
}

export function useRemoveFromStack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, stackId }: { leadId: string; stackId: string }) => {
      await api.delete(`/leads/${leadId}/stack/${stackId}`);
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["stack", leadId] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, leadId] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data } = await api.delete(`/leads/${leadId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

// ─── AI Assisted Operations ──────────────────────────────────────────

export function useAcceptAISuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, editedData }: { leadId: string; editedData?: Record<string, any> }) => {
      const { data } = await api.post(`/leads/${leadId}/ai/accept`, { edited_data: editedData });
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, leadId] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

export function useRejectAISuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data } = await api.post(`/leads/${leadId}/ai/reject`);
      return data;
    },
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, leadId] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

