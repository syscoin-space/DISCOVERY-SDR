"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth.store";
import api from "@/lib/api/client";
import type { AuthResponse } from "@/lib/types";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setAuth, clearAuth, hydrate } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await api.post<AuthResponse>("/auth/login", credentials);
      return data;
    },
    onSuccess: (data: any) => {
      const token = data.token ?? data.access_token;
      const refreshToken = data.refreshToken ?? data.refresh_token;
      setAuth({ user: data.user, token, refreshToken });
      router.push("/");
    },
  });

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return {
    user,
    isAuthenticated,
    hydrate,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout,
  };
}
