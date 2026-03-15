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

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 font-medium text-accent ${sizeClasses}`}
    >
      ICP {score}/{total}
    </span>
  );
}
