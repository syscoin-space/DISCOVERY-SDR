"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, Trophy, ArrowRight } from "lucide-react";
import { onboardingApi, type OnboardingState } from "@/lib/api/onboarding.api";
import Link from "next/link";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  href: string;
}

export function ActivationChecklist() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [summary, setSummary] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, summ] = await Promise.all([
        onboardingApi.getOnboardingState(),
        onboardingApi.getActivationSummary()
      ]);
      setState(s);
      setSummary(summ);
    } catch (error) {
      console.error("Failed to load checklist data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !state || state.tenant.onboarding_status === "COMPLETED") {
    return null;
  }

  const items: ChecklistItem[] = [
    { id: "company", label: "Perfil da Empresa", completed: summary.company_setup, href: "/onboarding" },
    { id: "team", label: "Adicionar Equipe", completed: summary.team_added, href: "/onboarding" },
    { id: "ai", label: "Configurar IA", completed: summary.ai_setup, href: "/onboarding" },
    { id: "leads", label: "Importar Primeiro Lead", completed: summary.first_lead, href: "/pipeline" },
    { id: "cadence", label: "Criar Cadência", completed: summary.first_cadence, href: "/cadencias" },
    { id: "calendar", label: "Conectar Agenda", completed: summary.calendar_connected, href: "/agenda" },
    { id: "handoff", label: "Primeiro Handoff", completed: summary.first_handoff, href: "/pipeline" },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="mx-3 my-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Ativação</span>
        </div>
        <span className="text-xs font-medium text-blue-500">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-zinc-800 rounded-full mb-4 overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {items.map(item => (
          <Link 
            key={item.id} 
            href={item.href}
            className="flex items-center gap-2.5 group/item cursor-pointer"
          >
            {item.completed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-zinc-600 group-hover/item:text-zinc-400" />
            )}
            <span className={`text-[11px] transition-colors ${item.completed ? "text-zinc-400 line-through" : "text-zinc-300 group-hover/item:text-white"}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <Link 
        href="/onboarding"
        className="mt-4 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Continuar Setup <ArrowRight size={12} />
      </Link>
    </div>
  );
}
