"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { GestorDashboard, GestorSdr, Meta } from "@/lib/types";

const GESTOR_KEY = "gestor";

export function useGestorDashboard() {
  return useQuery<GestorDashboard>({
    queryKey: [GESTOR_KEY, "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<GestorDashboard>("/gestor/dashboard");
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useGestorSdrs() {
  return useQuery<GestorSdr[]>({
    queryKey: [GESTOR_KEY, "sdrs"],
    queryFn: async () => {
      const { data } = await api.get<GestorSdr[]>("/gestor/sdrs");
      return data;
    },
  });
}

export function useMetas() {
  return useQuery<Meta[]>({
    queryKey: [GESTOR_KEY, "metas"],
    queryFn: async () => {
      const { data } = await api.get<Meta[]>("/gestor/metas");
      return data;
    },
  });
}

export function useCreateMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sdr_id?: string | null; tipo: string; valor: number; periodo: string }) => {
      const { data } = await api.post<Meta>("/gestor/metas", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GESTOR_KEY, "metas"] });
    },
  });
}

export function useUpdateMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; valor?: number; ativo?: boolean }) => {
      const { data } = await api.patch<Meta>(`/gestor/metas/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GESTOR_KEY, "metas"] });
    },
  });
}

export function useDeleteMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/gestor/metas/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GESTOR_KEY, "metas"] });
    },
  });
}
