"use client";

import type { IntegrabilityScore } from "@/lib/types";

interface IntegrabilityBadgeProps {
  level: IntegrabilityScore | null;
}

const config: Record<string, string> = {
  ALTA: "Plug & Play",
  MEDIA: "Média",
  DIFICIL: "Difícil",
};

export function IntegrabilityBadge({ level }: IntegrabilityBadgeProps) {
  if (!level) {
    return (
      <span className="inline-flex items-center rounded-md bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">
        Integr. —
      </span>
    );
  }

  const label = config[level] ?? config.DIFICIL;

  return (
    <span className="inline-flex items-center rounded-md bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">
      {label}
    </span>
  );
}
