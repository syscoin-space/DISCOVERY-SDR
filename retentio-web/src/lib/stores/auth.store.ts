import { create } from "zustand";
import type { User, Role } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  tenantId: string | null;
  membershipId: string | null;
  role: Role | null;

  setAuth: (params: {
    user: User;
    token: string;
    refreshToken: string;
  }) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  tenantId: null,
  membershipId: null,
  role: null,

  setAuth: ({ user, token, refreshToken }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", token);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("discovery_sdr_user", JSON.stringify(user));
      if (user.tenant_id) localStorage.setItem("tenantId", user.tenant_id);
      if (user.membership_id) localStorage.setItem("membershipId", user.membership_id);
    }

    set({
      user,
      token,
      isAuthenticated: true,
      tenantId: user.tenant_id || null,
      membershipId: user.membership_id || null,
      role: user.role || null,
    });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("discovery_sdr_user");
      localStorage.removeItem("tenantId");
      localStorage.removeItem("membershipId");
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      tenantId: null,
      membershipId: null,
      role: null,
    });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("discovery_sdr_user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({
          user,
          token,
          isAuthenticated: true,
          tenantId: user.tenant_id || localStorage.getItem("tenantId"),
          membershipId: user.membership_id || localStorage.getItem("membershipId"),
          role: user.role || null,
        });
      } catch {
        // Silently fail and clear invalid data
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("discovery_sdr_user");
          localStorage.removeItem("tenantId");
          localStorage.removeItem("membershipId");
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          tenantId: null,
          membershipId: null,
          role: null,
        });
      }
    }
  },
}));
