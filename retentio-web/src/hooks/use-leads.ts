"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Lead, LeadStatus, PaginatedResponse, Interaction } from "@/lib/types";

const LEADS_KEY = "leads";

interface LeadsFilters {
  status?: LeadStatus;
  prr_tier?: string;
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
      if (filters.prr_tier) params.set("prr_tier", filters.prr_tier);
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

export function useAllLeads() {
  return useQuery<Lead[]>({
    queryKey: [LEADS_KEY, "all"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Lead>>(
        "/leads?limit=50"
      );
      return data.data;
    },
  });
}

export function useInteractions(leadId: string | undefined) {
  return useQuery<Interaction[]>({
    queryKey: ["interactions", leadId],
    queryFn: async () => {
      const { data } = await api.get<Interaction[]>(`/leads/${leadId}/interactions`);
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

export function useCalculatePrr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data } = await api.patch(`/leads/${leadId}/prr-inputs`, {});
      return data;
    },
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, leadId] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}
