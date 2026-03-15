"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
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
      localStorage.setItem("accessToken", data.token ?? data.access_token);
      if (data.refreshToken || data.refresh_token) {
        localStorage.setItem("refreshToken", data.refreshToken ?? data.refresh_token);
      }
      if (data.user) {
        localStorage.setItem("retentio_user", JSON.stringify(data.user));
      }
      const role = data.user?.role;
      router.push(role === "GESTOR" ? "/gestor" : "/pipeline");
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2E86AB] to-[#1A7A5E]">
      <div className="w-full max-w-sm rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#2E86AB] to-[#1A7A5E] text-xl font-bold text-white shadow-lg">
            R
          </div>
          <h1 className="mt-3 text-xl font-bold text-[#1E3A5F]">Retentio</h1>
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E86AB] focus:outline-none focus:ring-2 focus:ring-[#2E86AB]/30"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E86AB] focus:outline-none focus:ring-2 focus:ring-[#2E86AB]/30"
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
            className="w-full rounded-lg bg-[#2E86AB] py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#256e8f] disabled:cursor-not-allowed disabled:opacity-60"
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
