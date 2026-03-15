"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Cadence, CadenceStep, StepChannel, CadenceType } from "@/lib/types";

const CADENCES_KEY = "cadences";

export function useCadences() {
  return useQuery<Cadence[]>({
    queryKey: [CADENCES_KEY],
    queryFn: async () => {
      const { data } = await api.get<Cadence[]>("/cadences");
      return data;
    },
  });
}

export function useCadence(cadenceId: string | undefined) {
  return useQuery<Cadence & { lead_cadences?: Array<{ lead: { id: string; company_name: string; status: string } }> }>({
    queryKey: [CADENCES_KEY, cadenceId],
    queryFn: async () => {
      const { data } = await api.get(`/cadences/${cadenceId}`);
      return data;
    },
    enabled: !!cadenceId,
  });
}

export interface CreateCadencePayload {
  name: string;
  type: CadenceType;
  description?: string;
  steps: Array<{
    step_order: number;
    day_offset: number;
    channel: StepChannel;
    template_id?: string;
    instructions?: string;
  }>;
}

export function useCreateCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCadencePayload) => {
      const { data } = await api.post<Cadence>("/cadences", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CADENCES_KEY] });
    },
  });
}

export function useEnrollLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cadenceId, leadId }: { cadenceId: string; leadId: string }) => {
      const { data } = await api.post(`/cadences/${cadenceId}/enroll`, { lead_id: leadId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CADENCES_KEY] });
    },
  });
}

export function useUpdateCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<CreateCadencePayload> & { id: string }) => {
      const { data } = await api.patch<Cadence>(`/cadences/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CADENCES_KEY] });
    },
  });
}

export function useDeleteCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cadences/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CADENCES_KEY] });
    },
  });
}

export function useUnenrollLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cadenceId, leadId }: { cadenceId: string; leadId: string }) => {
      await api.delete(`/cadences/${cadenceId}/enroll/${leadId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CADENCES_KEY] });
    },
  });
}
