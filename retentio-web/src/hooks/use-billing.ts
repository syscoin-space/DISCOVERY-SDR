"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { billingApi, PlanUsage } from "@/lib/api/billing.api";

const BILLING_KEY = "billing-plan";

export function useBillingCurrentPlan() {
  return useQuery<PlanUsage>({
    queryKey: [BILLING_KEY],
    queryFn: billingApi.getCurrentPlan,
    staleTime: 5 * 60_000,
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await billingApi.getPortalUrl();
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });
}
