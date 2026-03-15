"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { PrrInputs } from "@/lib/types";

const PRR_KEY = "prr";

export function usePrrInputs(leadId: string | undefined) {
  return useQuery<PrrInputs | null>({
    queryKey: [PRR_KEY, leadId],
    queryFn: async () => {
      try {
        const { data } = await api.get<PrrInputs>(`/leads/${leadId}/prr`);
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!leadId,
  });
}

export function useCalculatePrr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      inputs,
    }: {
      leadId: string;
      inputs: Partial<PrrInputs>;
    }) => {
      const { data } = await api.post(`/leads/${leadId}/prr/calculate`, inputs);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRR_KEY, variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads", variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
