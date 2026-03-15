"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface AppNotification {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  url: string | null;
  lida: boolean;
  enviada_at: string;
  lead_id: string | null;
}

interface NotificationsResponse {
  data: AppNotification[];
  meta: { total: number; page: number; limit: number; pages: number };
}

// ─── Unread count (dedicated endpoint, polls every 30s) ──

export function useUnreadCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { data } = await api.get("/notifications/unread-count");
      return data;
    },
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}

// ─── List notifications (paginated, filterable) ──

export function useNotifications(params?: {
  lida?: "true" | "false";
  tipo?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications", "list", params],
    queryFn: async () => {
      const { data } = await api.get("/notifications", { params });
      return data;
    },
    refetchInterval: 30_000,
  });
}

// ─── Preview (top 5 for popover) ──

export function useNotificationPreview() {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications", "list", { limit: 5, page: 1 }],
    queryFn: async () => {
      const { data } = await api.get("/notifications", {
        params: { limit: 5, page: 1 },
      });
      return data;
    },
    refetchInterval: 30_000,
  });
}

// ─── Mark one as read ──

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── Mark all as read ──

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
