"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";

const GOOGLE_KEY = "google";

// ─── Types ──────────────────────────────────────

export interface GoogleStatus {
  connected: boolean;
  email?: string;
  escopos?: string[];
}

export interface TimeSlot {
  inicio: string;
  fim: string;
  livre: boolean;
}

export interface CalendarEvent {
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
  created_at: string;
  lead?: {
    id: string;
    company_name: string;
    contact_name?: string;
    email?: string;
  };
}

export interface CreateCalendarEventPayload {
  leadId: string;
  closerUserId: string;
  titulo: string;
  descricao?: string;
  inicio: string; // ISO datetime
  fim: string;
  convidados?: string[];
  criarMeet?: boolean;
}

export interface SendGmailPayload {
  leadId: string;
  to: string;
  subject: string;
  body: string;
  templateId?: string;
}

// ─── Status ─────────────────────────────────────

export function useGoogleStatus() {
  return useQuery<GoogleStatus>({
    queryKey: [GOOGLE_KEY, "status"],
    queryFn: async () => {
      const { data } = await api.get<GoogleStatus>("/google/status");
      return data;
    },
  });
}

// ─── Connect (get auth URL) ─────────────────────

export function useGoogleConnect() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ url: string }>("/google/auth-url");
      return data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

// ─── Disconnect ─────────────────────────────────

export function useGoogleDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete("/google/disconnect");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GOOGLE_KEY, "status"] });
    },
  });
}

// ─── Calendar: Availability ─────────────────────

export function useCloserAvailability(closerUserId?: string, date?: string, duration?: number) {
  return useQuery<TimeSlot[]>({
    queryKey: [GOOGLE_KEY, "availability", closerUserId, date, duration],
    queryFn: async () => {
      const { data } = await api.get<TimeSlot[]>("/google/calendar/availability", {
        params: { closerUserId, date, duration },
      });
      return data;
    },
    enabled: !!closerUserId && !!date,
  });
}

// ─── Calendar: Create Event ─────────────────────

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCalendarEventPayload) => {
      const { data } = await api.post<{ eventId: string; meetLink: string | null }>(
        "/google/calendar/events",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GOOGLE_KEY, "events"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

// ─── Calendar: Cancel Event ─────────────────────

export function useCancelCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/google/calendar/events/${eventId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GOOGLE_KEY, "events"] });
    },
  });
}

// ─── Calendar: List Events ──────────────────────

export function useCalendarEvents(leadId?: string) {
  return useQuery<CalendarEvent[]>({
    queryKey: [GOOGLE_KEY, "events", leadId],
    queryFn: async () => {
      const { data } = await api.get<CalendarEvent[]>("/google/calendar/events", {
        params: leadId ? { leadId } : undefined,
      });
      return data;
    },
  });
}

// ─── Gmail: Send ────────────────────────────────

export function useSendGmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendGmailPayload) => {
      const { data } = await api.post<{ success: boolean; message_id: string }>(
        "/google/gmail/send",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
