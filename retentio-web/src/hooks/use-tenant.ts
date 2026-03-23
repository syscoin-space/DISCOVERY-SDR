"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";

export interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  discovery_enabled: boolean;
  onboarding_status: string;
  onboarding_step: number;
  active: boolean;
  branding?: any;
}

const TENANT_KEY = "tenant-settings";

export function useTenantSettings() {
  return useQuery<TenantSettings>({
    queryKey: [TENANT_KEY],
    queryFn: async () => {
      const { data } = await api.get<TenantSettings>("/tenant");
      return data;
    },
  });
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<TenantSettings, "name" | "discovery_enabled">>) => {
      const { data } = await api.patch<{ success: boolean; tenant: Partial<TenantSettings> }>("/tenant", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TENANT_KEY] });
      // Também invalida o usuário/me para atualizar o estado global se necessário
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
