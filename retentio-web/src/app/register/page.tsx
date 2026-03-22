"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Check, X, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    company_name: "",
  });
  
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from company name
  useEffect(() => {
    const generated = formData.company_name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    setSlug(generated);
  }, [formData.company_name]);

  // Check slug availability
  useEffect(() => {
    if (slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const { data } = await api.get(`/auth/check-slug/${slug}`);
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", formData);
      
      setAuth({
        token: data.token,
        refreshToken: data.refresh_token,
        user: data.user,
      });

      // Redirect to onboarding wizard
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.response?.data?.message || "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy via-accent to-green p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-navy">Comece seu Trial Grátis</h1>
          <p className="mt-2 text-sm text-gray-500">Crie sua conta em menos de 1 minuto.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Seu Nome</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                placeholder="Ex: Hugo"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">E-mail Corporativo</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                placeholder="hugo@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nome da Empresa</label>
            <input
              type="text"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="Ex: Retentio"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">URL da sua conta</label>
              {checkingSlug ? (
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              ) : slugAvailable === true ? (
                <span className="flex items-center gap-1 text-[10px] text-green-600">
                  <Check className="h-3 w-3" /> Disponível
                </span>
              ) : slugAvailable === false ? (
                <span className="flex items-center gap-1 text-[10px] text-red-600">
                  <X className="h-3 w-3" /> Já em uso
                </span>
              ) : null}
            </div>
            <div className="relative">
              <input
                type="text"
                value={slug}
                readOnly
                className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed"
              />
              <span className="absolute right-3 top-2 text-xs text-gray-400">.retentio.com.br</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || slugAvailable === false}
            className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Criando conta..." : "Criar minha conta agora"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
