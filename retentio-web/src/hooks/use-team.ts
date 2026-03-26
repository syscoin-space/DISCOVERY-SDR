"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Role } from "@/lib/types";

export interface Member {
  id: string;
  role: Role;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  active: boolean;
  created_at: string;
  _count?: {
    assigned_leads: number;
  };
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  created_at: string;
}

const TEAM_KEY = "team-members";
const INVITATIONS_KEY = "team-invitations";

export function useTeamMembers() {
  return useQuery<Member[]>({
    queryKey: [TEAM_KEY],
    queryFn: async () => {
      const { data } = await api.get<Member[]>("/memberships");
      return data;
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { data } = await api.patch(`/memberships/${id}`, { role });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEAM_KEY] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/memberships/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEAM_KEY] });
    },
  });
}

export function useInvitations() {
  return useQuery<Invitation[]>({
    queryKey: [INVITATIONS_KEY],
    queryFn: async () => {
      const { data } = await api.get<Invitation[]>("/invitations");
      return data;
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; role: Role }) => {
      const { data } = await api.post("/invitations", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVITATIONS_KEY] });
    },
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invitations/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVITATIONS_KEY] });
    },
  });
}
