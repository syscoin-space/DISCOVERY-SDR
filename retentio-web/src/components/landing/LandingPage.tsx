"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Rocket,
  Globe,
  Stars,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { billingApi, type PlanDetails } from "@/lib/api/billing.api";

export function LandingPage() {
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingApi.getPlans().then(setPlans).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/30">
      {/* Header / Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
            <span className="text-xl font-bold tracking-tight">Retentio</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-blue-600 transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Planos</a>
            <Link href="/login" className="px-5 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all font-bold text-zinc-900 dark:text-white">
              Entrar
            </Link>
            <Link href="/login" className="px-5 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 font-bold">
              Começar Agora
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold border border-blue-500/20 mb-4"
          >
            <Stars className="w-3 h-3" />
            V2 PRODUCTION READY
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]"
          >
            Transforme sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Prospecção</span> <br />
            em Máquina de Vendas.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed"
          >
            A plataforma completa de SDR que usa Inteligência Artificial para descobrir decisores, 
            gerenciar o pipeline e acelerar handoffs de leads qualificados.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-xl shadow-blue-600/30">
                Iniciar Teste Grátis <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-zinc-500 font-medium italic">Sem necessidade de cartão para começar.</p>
          </motion.div>

          {/* Hero Visual Mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative mt-20 p-2 rounded-[2.5rem] bg-zinc-200/50 dark:bg-zinc-800/20 border border-white/10 backdrop-blur shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-500/10 blur-[100px] pointer-events-none" />
            <img 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
              alt="Dashboard V2 Preview"
              className="rounded-[2.2rem] w-full border border-zinc-200 dark:border-zinc-800 shadow-inner"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">Por que escolher o Retentio?</h2>
            <p className="text-zinc-500">Desenvolvido por quem vive a operação de vendas todos os dias.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={Zap}
              title="Discovery com IA"
              description="Nossa IA encontra o real decisor em segundos, economizando horas de pesquisa manual para o seu SDR."
            />
            <FeatureCard 
              icon={BarChart3}
              title="Pipeline Visual V2"
              description="Gestão fluida de leads por estágios, com cards rich-media e histórico completo de interações."
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Handoff Sem Fricção"
              description="Transfira leads qualificados para seus Closers com contexto total, notas de IA e agenda sincronizada."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-black tracking-tight">Planos que acompanham seu crescimento</h2>
            <p className="text-zinc-500">Comece no Standard e escale conforme sua demanda aumenta.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[500px] bg-zinc-200 dark:bg-zinc-900 rounded-[2.5rem] animate-pulse" />
              ))
            ) : (
              plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] border-2 transition-all hover:scale-[1.02] duration-500 ${
                    plan.key === 'standard' 
                      ? "border-blue-600 shadow-2xl shadow-blue-600/10" 
                      : "border-zinc-100 dark:border-zinc-800"
                  }`}
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <p className="text-zinc-500 text-sm mt-2">{plan.description}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tighter">R$ {plan.price_monthly}</span>
                      <span className="text-zinc-400 font-medium">/mês</span>
                    </div>
                    <Link href="/login" className="block">
                      <Button className={`w-full h-12 rounded-2xl text-base font-bold transition-all ${
                        plan.key === 'standard' 
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30" 
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      }`}>
                        Selecionar {plan.name}
                      </Button>
                    </Link>
                    <div className="pt-8 space-y-4 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs font-black uppercase text-zinc-400 tracking-wider">Funcionalidades:</p>
                      <ul className="space-y-4">
                        <PricingFeature label={`${plan.limits.sdr} SDRs ativos`} />
                        <PricingFeature label={`${plan.limits.closer} Closers ativos`} />
                        <PricingFeature label={`${plan.limits.leads_monthly} Leads/mês`} />
                        {(Object.entries(plan.features) as [string, boolean][]).map(([key, enabled]) => (
                          enabled && <PricingFeature key={key} label={formatFeature(key)} />
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
              <span className="text-xl font-bold tracking-tight">Retentio</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              A melhor estrutura para o seu time de vendas de alta performance. 
              Venda mais, prospecte melhor.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Produto</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-blue-600">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-blue-600">Para Times</a></li>
              <li><a href="#" className="hover:text-blue-600">Segurança</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Suporte</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-blue-600">Ajuda</a></li>
              <li><a href="#" className="hover:text-blue-600">Documentação</a></li>
              <li><a href="#" className="hover:text-blue-600">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Institucional</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-blue-600">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-blue-600">Políticas de Privacidade</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-20 pt-8 border-t border-zinc-100 dark:border-zinc-900 text-center text-zinc-400 text-xs font-medium">
          © 2026 Retentio CRM. Todos os direitos reservados para Syscoin Space.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: any) {
  return (
    <div className="p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 hover:border-blue-500/30 transition-all group">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-600/20 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function PricingFeature({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
      {label}
    </li>
  );
}

function formatFeature(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
