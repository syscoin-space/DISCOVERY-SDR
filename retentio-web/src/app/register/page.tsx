"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Globe, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [slugMessage, setSlugMessage] = useState("");
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
      setSlugMessage("");
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const { data } = await api.get(`/auth/check-slug/${slug}`);
        setSlugAvailable(data.available);
        setSlugMessage(data.message || "");
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugAvailable === false) return;
    
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", formData);
      
      setAuth({
        token: data.token,
        refreshToken: data.refreshToken,
        user: data.user,
      });

      router.push("/onboarding");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao criar sua jornada comercial. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left side: branding/copy */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-accent opacity-50" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">DISCOVERY <span className="text-accent underline decoration-4 underline-offset-4">SDR</span></span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-extrabold tracking-tight leading-tight">
              Sua operação de <br />
              <span className="text-accent">SDR em escala</span>, <br />
              começa hoje.
            </h2>
            <p className="text-lg text-zinc-400 font-medium max-w-md">
              A V2 foi desenhada para transformar prospecção em um processo previsível, auditável e altamente lucrativo.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-bold text-sm">Self-Service Onboarding</p>
                <p className="text-xs text-zinc-500">Configuração guiada e ativação imediata.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <Globe className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-bold text-sm">Escopo Corporativo</p>
                <p className="text-xs text-zinc-500">Múltiplos times, faturamento único e controle total.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-zinc-500 font-medium tracking-widest uppercase">
          Discovery SDR V2 — 2026 Edition
        </div>
      </div>

      {/* Right side: form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 lg:hidden">
             <span className="text-2xl font-black tracking-tighter text-navy dark:text-white">DISCOVERY <span className="text-accent italic">SDR</span></span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Criar sua conta</h1>
            <p className="text-zinc-500 font-medium italic">Teste todas as funcionalidades por 14 dias grátis.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome</Label>
                  <Input 
                    id="name" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Hugo"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Corporativo</Label>
                  <Input 
                    id="email" 
                    type="email"
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="hugo@empresa.com"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input 
                  id="company_name" 
                  required 
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Minha Empresa Ltda"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-600">Endereço da sua conta</Label>
                  {checkingSlug ? (
                    <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                  ) : slugAvailable === true ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Disponível
                    </span>
                  ) : slugAvailable === false ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                      <XCircle className="h-3 w-3" /> {slugMessage || "Indisponível"}
                    </span>
                  ) : null}
                </div>
                <div className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 overflow-hidden ${
                  slugAvailable === true ? "border-green-500/20 bg-green-500/5" : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                }`}>
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className={`text-sm font-bold truncate ${slugAvailable === true ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
                      {slug || "empresa"}
                    </span>
                    <span className="text-zinc-400 text-xs">.discoverysdr.com.br</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Criar Senha</Label>
                <Input 
                  id="password" 
                  type="password"
                  required 
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="No mínimo 6 caracteres"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2 animate-in fade-in zoom-in">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading || slugAvailable === false}
              className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold shadow-lg shadow-accent/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Começar minha jornada grátis"
              )}
            </Button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-sm text-zinc-500 font-medium">
              Já faz parte do time?{" "}
              <Link href="/login" className="text-accent font-bold hover:underline underline-offset-4">
                Entrar agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
