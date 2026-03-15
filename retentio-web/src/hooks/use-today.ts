"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { DailyTask, TodaySummary, DailyTaskStatus } from "@/lib/types";

const TODAY_KEY = "today";
const TODAY_SUMMARY_KEY = "today-summary";

export function useTodayTasks() {
  return useQuery<DailyTask[]>({
    queryKey: [TODAY_KEY],
    queryFn: async () => {
      const { data } = await api.get<DailyTask[]>("/today");
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
    mutationFn: async (payload: { lead_id: string; canal?: string }) => {
      const { data } = await api.post<DailyTask>("/today", payload);
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
      status?: DailyTaskStatus;
      resultado?: string;
      proximo_contato?: string | null;
      canal?: string | null;
    }) => {
      const { data } = await api.patch<DailyTask>(`/today/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TODAY_KEY] });
      qc.invalidateQueries({ queryKey: [TODAY_SUMMARY_KEY] });
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
