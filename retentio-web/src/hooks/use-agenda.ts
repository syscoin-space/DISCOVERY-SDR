"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Task } from "@/lib/types";

// ─── Types ──────────────────────────────────────

export interface AgendaReuniao {
  id: string;
  google_event_id: string;
  lead_id: string;
  closer_user_id: string;
  sdr_user_id: string;
  titulo: string;
  descricao?: string;
  inicio: string;
  fim: string;
  meet_link?: string;
  status: string;
  convidados: string[];
  lead: {
    id: string;
    company_name: string;
    contact_name?: string;
    email?: string;
    niche?: string;
  };
}

export interface AgendaTask extends Task {
  lead: NonNullable<Task["lead"]>;
}

export interface GoogleCalEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  meetLink?: string;
  attendees: string[];
}

export interface AgendaData {
  reunioes: AgendaReuniao[];
  tasks: AgendaTask[];
  google_events: GoogleCalEvent[];
}

export interface CloserInfo {
  id: string;
  name: string;
  email: string;
  google_email: string | null;
  avatar_initials: string;
}

// ─── Hooks ──────────────────────────────────────

export function useAgenda(inicio?: string, fim?: string, closerId?: string) {
  return useQuery<AgendaData>({
    queryKey: ["agenda", inicio, fim, closerId],
    queryFn: async () => {
      const params: Record<string, string> = { inicio: inicio!, fim: fim! };
      if (closerId) params.closer_id = closerId;
      const { data } = await api.get<AgendaData>("/agenda", { params });
      return data;
    },
    enabled: !!inicio && !!fim,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClosers() {
  return useQuery<CloserInfo[]>({
    queryKey: ["agenda", "closers"],
    queryFn: async () => {
      const { data } = await api.get<CloserInfo[]>("/agenda/closers");
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
