"use client";

interface ICPBadgeProps {
  score: number | null;
  total?: number;
  size?: "sm" | "md";
}

export function ICPBadge({ score, total = 14, size = "sm" }: ICPBadgeProps) {
  const sizeClasses = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";

  if (score == null) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised font-medium text-muted-foreground ${sizeClasses}`}>
        ICP —
      </span>
    );
  }

  const getColors = (s: number) => {
    if (s <= 50) return "text-red-500 bg-red-500/10 border-red-500/20";
    if (s <= 74) return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    if (s <= 89) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    return "text-green-500 bg-green-500/10 border-green-500/20";
  };

  const colorClasses = getColors(score);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium transition-colors ${colorClasses} ${sizeClasses}`}
    >
      ICP {score}
    </span>
  );
}
