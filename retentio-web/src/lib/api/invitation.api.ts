import api from "./client";

export interface InvitationContext {
  email: string;
  role: string;
  tenantName: string;
  tenantSlug: string;
  userExists: boolean;
  userName?: string;
}

export const invitationApi = {
  verify: async (token: string) => {
    const { data } = await api.get<InvitationContext>(`/invitations/verify/${token}`);
    return data;
  },

  registerAndAccept: async (payload: { token: string; name: string; password: string }) => {
    const { data } = await api.post("/invitations/register-accept", payload);
    return data;
  },

  loginAndAccept: async (payload: { token: string; password: string }) => {
    const { data } = await api.post("/invitations/login-accept", payload);
    return data;
  }
};
