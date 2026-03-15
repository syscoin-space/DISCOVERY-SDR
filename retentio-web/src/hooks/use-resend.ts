"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ResendConfig, EmailAuditItem, EmailStats } from "@/lib/types";

const RESEND_KEY = "resend";

// ─── Config ────────────────────────────────────

export function useResendConfig() {
  return useQuery<ResendConfig | null>({
    queryKey: [RESEND_KEY, "config"],
    queryFn: async () => {
      try {
        const { data } = await api.get<ResendConfig>("/resend/config");
        return data;
      } catch (err: unknown) {
        const error = err as { response?: { status: number } };
        if (error.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

export interface SaveResendConfigPayload {
  from_email: string;
  from_name?: string;
  api_key: string;
  daily_limit?: number;
}

export function useSaveResendConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveResendConfigPayload) => {
      const { data } = await api.put<ResendConfig>("/resend/config", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESEND_KEY, "config"] });
    },
  });
}

export function useTestResendConnection() {
  return useMutation({
    mutationFn: async (to: string) => {
      const { data } = await api.post<{ success: boolean; message_id: string }>(
        "/resend/test",
        { to }
      );
      return data;
    },
  });
}

// ─── Email Audit ───────────────────────────────

export function useEmailAudit(params?: { lead_id?: string; status?: string; page?: number }) {
  return useQuery<{ data: EmailAuditItem[]; meta: { total: number; page: number; limit: number; pages: number } }>({
    queryKey: [RESEND_KEY, "emails", params],
    queryFn: async () => {
      const { data } = await api.get("/resend/emails", { params });
      return data;
    },
  });
}

export function useEmailStats(days = 30) {
  return useQuery<EmailStats>({
    queryKey: [RESEND_KEY, "stats", days],
    queryFn: async () => {
      const { data } = await api.get<EmailStats>("/resend/emails/stats", { params: { days } });
      return data;
    },
  });
}
