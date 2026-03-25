"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Template, StepChannel } from "@/lib/types";

const TEMPLATES_KEY = "templates";

export function useTemplates() {
  return useQuery<Template[]>({
    queryKey: [TEMPLATES_KEY],
    queryFn: async () => {
      const { data } = await api.get<Template[]>("/templates");
      return data;
    },
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery<Template>({
    queryKey: [TEMPLATES_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Template>(`/templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export interface CreateTemplatePayload {
  name: string;
  subject?: string;
  body: string;
  channel: StepChannel;
  purpose?: string;
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data } = await api.post<Template>("/templates", {
        purpose: "PRIMEIRO_CONTATO",
        ...payload,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<CreateTemplatePayload> & { id: string }) => {
      const { data } = await api.patch<Template>(`/templates/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    },
  });
}
