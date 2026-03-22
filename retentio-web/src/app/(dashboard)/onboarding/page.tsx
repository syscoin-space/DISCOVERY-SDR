"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, 
  Users, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Rocket
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth.store";
import api from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "COMPANY" | "TEAM" | "AI" | "SUCCESS";

export default function OnboardingPage() {
  const { user, hydrate } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<Step>("COMPANY");
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [companyName, setCompanyName] = useState(user?.tenant?.name || "");
  const [teamSize, setTeamSize] = useState("1-3");
  const [aiProvider, setAiProvider] = useState("openrouter");
  const [aiKey, setAiKey] = useState("");

  useEffect(() => {
    if (user?.tenant?.onboarding_status === "COMPLETED") {
      window.location.href = "/pipeline"; // Force hard redirect to clear state
    }
  }, [user]);

  // Load name from tenant more reliably
  useEffect(() => {
    if (user?.tenant?.name && !companyName) {
      setCompanyName(user.tenant.name);
    }
  }, [user?.tenant?.name, companyName]);

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === "COMPANY") {
        await api.patch("/onboarding/company", { name: companyName });
        setStep("TEAM");
      } else if (step === "TEAM") {
        setStep("AI");
      } else if (step === "AI") {
        await api.patch("/onboarding/ai", { 
          provider: aiProvider.toUpperCase(), 
          api_key: aiKey || "sk-dummy-onboarding-key-12345" 
        });
        setStep("SUCCESS");
      } else if (step === "SUCCESS") {
        const response = await api.post("/onboarding/complete");
        
        // Atualização manual e bruta para garantir persistência imediata
        const storedUser = localStorage.getItem("retentio_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.tenant) {
            parsed.tenant.onboarding_status = "COMPLETED";
            localStorage.setItem("retentio_user", JSON.stringify(parsed));
          }
        }

        await hydrate(); // Re-hidrata a store
        window.location.href = "/pipeline"; // Redirecionamento forçado
      }
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "COMPANY":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Confirmar sua Empresa</h2>
              <p className="text-sm text-muted-foreground">Vamos começar personalizando sua conta Retentio.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input 
                  id="companyName" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Minha Empresa Ltda"
                  className="h-12 text-lg rounded-xl border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>
        );
      case "TEAM":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Expandir o Time</h2>
              <p className="text-sm text-muted-foreground">Quem mais vai ajudar na prospecção?</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {["1-3", "4-10", "11+"].map((size) => (
                  <button
                    key={size}
                    onClick={() => setTeamSize(size)}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      teamSize === size 
                      ? "border-accent bg-accent/5 text-accent" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200"
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-2" />
                    <span className="text-xs font-bold">{size} pessoas</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case "AI":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Ativar a Inteligência</h2>
              <p className="text-sm text-muted-foreground">Configuração do motor de descoberta e IA assistiva.</p>
            </div>
            <div className="space-y-3">
              {[
                { id: "openrouter", name: "OpenRouter (Recomendado)", desc: "Acesso a Claude, GPT-4 e Llama em um lugar." },
                { id: "openai", name: "OpenAI Direct", desc: "Uso direto via API Key da OpenAI." }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setAiProvider(p.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                    aiProvider === p.id 
                    ? "border-accent bg-accent/5" 
                    : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${aiProvider === p.id ? "bg-accent text-white" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{p.name}</h4>
                    <p className="text-[10px] text-zinc-500">{p.desc}</p>
                  </div>
                </button>
              ))}

              <div className="space-y-2 pt-4">
                <Label htmlFor="aiKey" className="text-xs font-bold uppercase text-zinc-500">Sua API Key</Label>
                <Input 
                  id="aiKey"
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="sk-..."
                  className="h-12 rounded-xl border-zinc-200"
                />
              </div>
            </div>
          </div>
        );
      case "SUCCESS":
        return (
          <div className="space-y-8 py-4 text-center animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
              <Rocket className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight">Tudo Pronto!</h2>
              <p className="text-zinc-500 font-medium">Sua conta foi ativada com sucesso.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            {renderStep()}

            <div className="mt-12 flex flex-col gap-3">
              <Button 
                onClick={handleNext} 
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-accent text-white text-lg font-bold"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (step === "SUCCESS" ? "Entrar na Plataforma" : "Continuar")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
