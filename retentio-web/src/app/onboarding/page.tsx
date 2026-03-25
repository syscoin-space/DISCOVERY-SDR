"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Users, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Rocket,
  ChevronRight
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth.store";
import api from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/shared/BrandLogo";


type Step = "COMPANY" | "TEAM" | "AI" | "SUCCESS";

const STEPS: { key: Step; label: string; icon: typeof Building2; description: string }[] = [
  { key: "COMPANY", label: "Empresa", icon: Building2, description: "Confirme os dados" },
  { key: "TEAM", label: "Time", icon: Users, description: "Dimensione seu time" },
  { key: "AI", label: "Inteligência", icon: Zap, description: "Configure a IA" },
  { key: "SUCCESS", label: "Go-Live", icon: Rocket, description: "Ative sua conta" },
];

export default function OnboardingPage() {
  const { user, hydrate } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState<Step>("COMPANY");
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [companyName, setCompanyName] = useState("");
  const [teamSize, setTeamSize] = useState("1-3");
  const [aiProvider, setAiProvider] = useState("openrouter");
  const [aiKey, setAiKey] = useState("");

  useEffect(() => {
    if (user?.tenant?.onboarding_status === "COMPLETED") {
      window.location.href = "/pipeline";
    }
  }, [user]);

  useEffect(() => {
    if (user?.tenant?.name && !companyName) {
      setCompanyName(user.tenant.name);
    }
  }, [user?.tenant?.name, companyName]);

  const currentIndex = STEPS.findIndex(s => s.key === step);
  const progress = Math.round(((currentIndex) / (STEPS.length)) * 100);

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
        await api.post("/onboarding/complete");
        
        const storedUser = localStorage.getItem("discovery_sdr_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.tenant) {
            parsed.tenant.onboarding_status = "COMPLETED";
            parsed.tenant.name = companyName; 
            parsed.onboarding_state = { tasks_completed: { company_setup: true, team_added: true, ai_setup: true } };
            localStorage.setItem("discovery_sdr_user", JSON.stringify(parsed));
          }
        }

        await hydrate(); 
        window.location.href = "/pipeline"; 
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
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Confirmar sua Empresa</h2>
              <p className="text-sm text-zinc-500">Sua conta foi criada como: <strong className="text-accent">{user?.tenant?.name}</strong></p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Exibição</Label>
                <Input 
                  id="companyName" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Minha Empresa Ltda"
                  className="h-12 text-lg rounded-xl border-zinc-200"
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
              <p className="text-sm text-zinc-500">Quem mais vai ajudar na prospecção?</p>
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
              <p className="text-sm text-zinc-500">Configuração do motor de descoberta.</p>
            </div>
            <div className="space-y-3">
              {[
                { id: "openrouter", name: "OpenRouter", desc: "Recomendado para multi-modelo." },
                { id: "openai", name: "OpenAI Direct", desc: "Uso direto via API Key." }
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
              <p className="text-zinc-500 font-medium text-lg">Bem-vindo ao Discovery SDR V2.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Left Sidebar — Step tracker */}
      <div className="hidden lg:flex w-80 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col justify-between p-8">
        <div className="space-y-8">
          <div className="space-y-1">
            <BrandLogo size="sm" />
            <p className="text-[10px] text-zinc-400 font-medium pl-9">Configuração Inicial</p>
          </div>

          {/* Steps */}
          <div className="space-y-1">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.key === step;
              const isCompleted = idx < currentIndex;
              
              return (
                <div 
                  key={s.key}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActive 
                      ? "bg-blue-600/10 text-blue-600" 
                      : isCompleted 
                        ? "text-green-600" 
                        : "text-zinc-400"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : isCompleted 
                        ? "bg-green-500/10 text-green-600" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {s.label}
                    </p>
                    <p className="text-[10px] text-zinc-400">{s.description}</p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-500">Progresso</span>
            <span className="text-accent">{progress}%</span>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 text-center">
            Passo {currentIndex + 1} de {STEPS.length}
          </p>
        </div>
      </div>

      {/* Mobile progress bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <BrandLogo size="sm" />
          <span className="ml-auto text-xs font-bold text-accent">{progress}%</span>
        </div>
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent transition-all duration-700" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 pt-24 lg:pt-6">
        <div className="w-full max-w-xl space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-xl overflow-hidden">
            <div className="p-8 sm:p-12">
              {renderStep()}

              <div className="mt-12 flex flex-col gap-3">
                <Button 
                  onClick={handleNext} 
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-accent hover:bg-accent-hover text-white text-lg font-bold shadow-lg shadow-accent/20 transition-all"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <span className="flex items-center gap-2">
                      {step === "SUCCESS" ? "Fazer Go-Live 🚀" : "Continuar"} 
                      {step !== "SUCCESS" && <ArrowRight className="w-5 h-5" />}
                    </span>
                  )}
                </Button>
                {step === "AI" && (
                  <button
                    onClick={() => setStep("SUCCESS")}
                    className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-2"
                  >
                    Configurar depois →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
