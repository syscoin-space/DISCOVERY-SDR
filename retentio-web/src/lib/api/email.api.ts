import api from "./client";

export interface EmailConfig {
  id?: string;
  provider: "RESEND" | "SMTP";
  is_enabled: boolean;
  api_key_masked?: string | null;
  sender_name?: string;
  sender_email?: string;
  reply_to?: string | null;
  updated_at?: string;
}

export interface UpsertEmailConfig {
  provider: "RESEND" | "SMTP";
  is_enabled?: boolean;
  api_key?: string;
  sender_name?: string;
  sender_email?: string;
  reply_to?: string | null;
}

export const emailApi = {
  getConfig: async () => {
    const { data } = await api.get<EmailConfig>("/tenant/email-config");
    return data;
  },

  upsertConfig: async (payload: UpsertEmailConfig) => {
    const { data } = await api.put<EmailConfig>("/tenant/email-config", payload);
    return data;
  },

  testConnection: async (payload: { provider: string; api_key?: string; to: string }) => {
    const { data } = await api.post<{ success: boolean; message: string }>("/tenant/email-config/test", payload);
    return data;
  }
};
