"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useBrand } from "@/hooks/use-brand";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { data: brand } = useBrand();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      
      // Centralized V2 Auth
      setAuth({
        token: data.token || data.access_token,
        refreshToken: data.refreshToken || data.refresh_token,
        user: data.user,
      });

      const role = data.user?.role;
      
      // V2 Redirection logic
      if (role === "OWNER" || role === "MANAGER") {
        router.push("/gestor");
      } else if (role === "CLOSER") {
        router.push("/agenda");
      } else {
        router.push("/pipeline");
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || "Falha no login");
      } else {
        setError("Erro de conexão");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy via-accent to-green">
      <div className="w-full max-w-sm rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          {brand?.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.app_name}
              className="object-contain"
              style={{ width: 200, height: 70, borderRadius: 8 }}
            />
          ) : (
            <>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${brand?.color_accent ?? "#2E86AB"}, ${brand?.color_green ?? "#1A7A5E"})`,
                }}
              >
                {(brand?.app_name ?? "R").charAt(0).toUpperCase()}
              </div>
              <h1
                className="mt-3 text-xl font-bold"
                style={{ color: brand?.color_navy ?? "#1E3A5F" }}
              >
                {brand?.app_name ?? "Retentio"}
              </h1>
            </>
          )}
          <p className="mt-1 text-xs text-gray-500">CRM de Prospecção SDR</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="sdr@empresa.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-gray-400">
          Retentio © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
