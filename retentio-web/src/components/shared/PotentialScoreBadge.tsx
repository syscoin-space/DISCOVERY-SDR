"use client";

import type { FitTier } from "@/lib/types";

interface PotentialScoreBadgeProps {
  tier: string | null;
  score: number | null;
  size?: "sm" | "md";
}

const tierConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  A: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  B: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  C: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-500",
  },
};

export function PotentialScoreBadge({ tier, score, size = "sm" }: PotentialScoreBadgeProps) {
  if (!tier) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs text-muted-foreground">
        Score —
      </span>
    );
  }

  const config = tierConfig[tier as string] ?? tierConfig.C;
  const sizeClasses = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {tier} · {score != null ? Math.round(score) : "—"}
    </span>
  );
}
