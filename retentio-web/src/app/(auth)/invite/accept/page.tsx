"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { invitationApi, type InvitationContext } from "@/lib/api/invitation.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function InviteAcceptPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<InvitationContext | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token de convite não encontrado na URL.");
      setIsLoading(false);
      return;
    }

    invitationApi.verify(token)
      .then(data => {
        setContext(data);
        if (data.userExists && data.userName) {
          setName(data.userName);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || "Convite inválido, cancelado ou expirado.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !context) return;

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (!context.userExists && name.trim().length < 2) {
      setError("Você precisa informar seu nome.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let response;
      if (context.userExists) {
        response = await invitationApi.loginAndAccept({ token, password });
      } else {
        response = await invitationApi.registerAndAccept({ token, name, password });
      }

      // Atualizar o Zustand Store com a sessão do usuário
      if (response.user && response.token) {
        setAuth({ 
          user: response.user, 
          token: response.token, 
          refreshToken: response.refreshToken || response.token 
        });
        router.push("/dashboard"); // Vai para a tela principal (já no tenant correto)
      } else {
        throw new Error("Erro ao estabelecer sessão.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro inesperado ao aceitar o convite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-surface">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Convite Indisponível</h2>
          <p className="text-gray-500 pb-4">{error}</p>
          <Button onClick={() => router.push("/login")} variant="default" className="w-full">
            Ir para o Login
          </Button>
        </div>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-surface/50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
        
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-6 ring-8 ring-accent/5">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Você foi convidado!</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Você foi convidado para participar do time <strong className="text-gray-900">{context.tenantName}</strong> como <strong className="text-accent">{context.role}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 border border-red-100">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 font-medium uppercase tracking-wider">E-mail Corporativo</Label>
              <Input value={context.email} disabled className="bg-gray-100 text-gray-700 font-medium shadow-none cursor-not-allowed" />
            </div>

            {!context.userExists && (
              <div className="space-y-1.5">
                <Label>Como devemos te chamar?</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Seu nome completo"
                  autoFocus
                  required
                />
              </div>
            )}

            {context.userExists && (
              <div className="bg-accent/5 border border-accent/20 p-3 rounded-lg text-sm text-accent/80 font-medium">
                Sua conta já existe na plataforma. Digite sua senha para vincular seu acesso ao time {context.tenantName}.
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{context.userExists ? "Sua Senha" : "Crie uma Senha"}</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="No mínimo 6 caracteres"
                required
                minLength={6}
                autoFocus={context.userExists}
              />
            </div>

            {!context.userExists && (
              <div className="space-y-1.5">
                <Label>Confirme a Senha</Label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Digite a senha novamente"
                  required
                  minLength={6}
                />
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-base font-bold bg-accent hover:bg-accent/90">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Aceitar Convite e Entrar"}
          </Button>

          <p className="text-center text-[11px] text-gray-400 mt-6">
            Discovery SDR — Inteligência Comercial em Escala
          </p>
        </form>
      </div>
    </div>
  );
}
