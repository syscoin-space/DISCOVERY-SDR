"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Users, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import { onboardingApi, type OnboardingState } from "@/lib/api/onboarding.api";
import { Button } from "@/components/ui/button";

const STEPS = [
  { id: "welcome", title: "Boas-vindas", icon: CheckCircle2 },
  { id: "company", title: "Sua Empresa", icon: Building2 },
  { id: "team", title: "Seu Time", icon: Users },
  { id: "ai", title: "Inteligência Artificial", icon: Cpu },
  { id: "ready", title: "Pronto!", icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<OnboardingState | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [teamMembers, setTeamMembers] = useState([{ email: "", name: "", role: "SDR" }]);
  const [aiProvider, setAiProvider] = useState("OPENAI");
  const [aiApiKey, setAiApiKey] = useState("");

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const s = await onboardingApi.getOnboardingState();
      setState(s);
      setCompanyName(s.tenant.name);
      
      // Map server step to local step
      if (s.tenant.onboarding_status === "COMPLETED") {
        router.push("/hoje");
      } else {
        setCurrentStep(s.tenant.onboarding_step + 1); // +1 because server index might be behind
      }
    } catch (error) {
      console.error("Failed to load onboarding state", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setSubmitting(true);
    try {
      if (currentStep === 1) { // Company
        await onboardingApi.updateCompany(companyName);
      } else if (currentStep === 2) { // Team
        const validMembers = teamMembers.filter(m => m.email && m.name);
        if (validMembers.length > 0) {
          await onboardingApi.setupTeam(validMembers);
        }
      } else if (currentStep === 3) { // AI
        if (aiApiKey) {
          await onboardingApi.setupAI(aiProvider, aiApiKey);
        }
      } else if (currentStep === 4) { // Finish
        await onboardingApi.completeOnboarding();
        router.push("/hoje");
        return;
      }
      
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      console.error("Action failed", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12 items-start relative z-10">
        
        {/* Sidebar Navigation */}
        <div className="space-y-8 hidden md:block">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic">
              Discovery SDR
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Setup da sua operação V2</p>
          </div>

          <div className="space-y-4">
            {STEPS.map((step, idx) => (
              <div 
                key={step.id} 
                className={`flex items-center gap-3 transition-all duration-300 ${
                  idx === currentStep ? "text-blue-400 scale-105" : idx < currentStep ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  idx === currentStep ? "border-blue-400 bg-blue-400/10" : idx < currentStep ? "border-zinc-400 bg-zinc-400/10" : "border-zinc-800"
                }`}>
                  {idx < currentStep ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                <span className="font-medium">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Wizard */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <StepIcon size={120} />
          </div>

          <div className="relative z-10">
            {currentStep === 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-8">
                  <ArrowRight size={32} />
                </div>
                <h2 className="text-3xl font-bold font-display leading-[1.1]">Vamos configurar sua <br/> máquina de Discovery.</h2>
                <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                  Bem-vindo ao Discovery SDR V2. Em poucos passos você terá sua operação 100% pronta para escala.
                </p>
                <Button 
                  onClick={() => setCurrentStep(1)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 h-12 text-base shadow-lg shadow-blue-500/20 group"
                >
                  Começar agora
                  <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold">Resumo da sua Empresa</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Nome da Empresa</label>
                    <input 
                      type="text" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Minha Empresa SaaS"
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 h-12 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleNext} 
                  disabled={!companyName || submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 h-12 w-full md:w-auto"
                >
                  {submitting ? <Loader2 className="animate-spin mr-2" /> : "Salvar e Continuar"}
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold">Monte seu Time Inicial</h2>
                <p className="text-zinc-400">Adicione os SDRs e Closers que vão operar na V2.</p>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {teamMembers.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <input 
                        placeholder="Nome" 
                        value={m.name}
                        onChange={(e) => {
                          const n = [...teamMembers];
                          n[idx].name = e.target.value;
                          setTeamMembers(n);
                        }}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 h-10 outline-none focus:border-blue-500"
                      />
                      <input 
                        placeholder="E-mail" 
                        value={m.email}
                        onChange={(e) => {
                          const n = [...teamMembers];
                          n[idx].email = e.target.value;
                          setTeamMembers(n);
                        }}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 h-10 outline-none focus:border-blue-500"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-500 hover:text-red-400"
                        onClick={() => setTeamMembers(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-xl"
                  onClick={() => setTeamMembers([...teamMembers, { email: "", name: "", role: "SDR" }])}
                >
                  <Plus size={16} className="mr-2" /> Adicionar membros
                </Button>

                <div className="pt-4 border-t border-zinc-800 flex gap-4">
                  <Button 
                    onClick={handleNext} 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 h-12"
                  >
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : "Continuar"}
                  </Button>
                  <Button variant="ghost" onClick={() => setCurrentStep(prev => prev + 1)}>Pular por enquanto</Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold">Configure seu Motor de IA</h2>
                <p className="text-zinc-400">A V2 escala melhor com IA. Conecte sua chave para habilitar sugestões automáticas.</p>
                
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm flex gap-3">
                  <Cpu size={18} className="shrink-0" />
                  <span>Você pode pular este passo e configurar depois em Configurações.</span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      onClick={() => setAiProvider("OPENAI")}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${aiProvider === "OPENAI" ? "border-blue-500 bg-blue-500/5" : "border-zinc-800 opacity-50 text-zinc-500 hover:opacity-100"}`}
                    >
                      <span className="font-bold">OpenAI</span>
                    </div>
                    <div 
                      onClick={() => setAiProvider("OPENROUTER")}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${aiProvider === "OPENROUTER" ? "border-blue-500 bg-blue-500/5" : "border-zinc-800 opacity-50 text-zinc-500 hover:opacity-100"}`}
                    >
                      <span className="font-bold">OpenRouter</span>
                    </div>
                  </div>

                  <input 
                    type="password" 
                    placeholder="Sua API Key"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 h-12 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-800 flex gap-4">
                  <Button 
                    onClick={handleNext} 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 h-12"
                  >
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : "Conectar IA"}
                  </Button>
                  <Button variant="ghost" onClick={handleNext}>Pular</Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8 animate-in zoom-in duration-700 text-center">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto animate-bounce">
                  <CheckCircle2 size={48} />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold">Está tudo pronto!</h2>
                  <p className="text-zinc-400">Sua operação V2 foi configurada com sucesso. Clique abaixo para entrar no seu painel.</p>
                </div>
                <Button 
                  onClick={handleNext} 
                  className="bg-white hover:bg-zinc-100 text-black rounded-full px-12 h-14 text-lg font-bold shadow-2xl shadow-white/10"
                >
                  Ir para o Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
