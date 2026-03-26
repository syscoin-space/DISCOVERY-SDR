"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Task, TodaySummary, TaskStatus } from "@/lib/types";

const TODAY_KEY = "today";
const TODAY_SUMMARY_KEY = "today-summary";

export function useTodayTasks() {
  return useQuery<Task[]>({
    queryKey: [TODAY_KEY],
    queryFn: async () => {
      const { data } = await api.get<Task[]>("/today");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useTodaySummary() {
  return useQuery<TodaySummary>({
    queryKey: [TODAY_SUMMARY_KEY],
    queryFn: async () => {
      const { data } = await api.get<TodaySummary>("/today/summary");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAddToToday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { lead_id: string; channel?: string; title?: string }) => {
      const { data } = await api.post<Task>("/today", {
        ...payload,
        title: payload.title ?? "Contato Manual",
        type: "MANUAL",
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TODAY_KEY] });
      qc.invalidateQueries({ queryKey: [TODAY_SUMMARY_KEY] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      status?: TaskStatus;
      outcome?: string;
      scheduled_at?: string | null;
      channel?: string | null;
    }) => {
      const { data } = await api.patch<Task>(`/today/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [TODAY_KEY] });
      qc.invalidateQueries({ queryKey: [TODAY_SUMMARY_KEY] });
      // Invalidate the specific lead and the global leads list to reflect task completion
      if (data.lead_id) {
        qc.invalidateQueries({ queryKey: ["leads", data.lead_id] });
      }
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useRemoveFromToday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/today/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TODAY_KEY] });
      qc.invalidateQueries({ queryKey: [TODAY_SUMMARY_KEY] });
    },
  });
}
