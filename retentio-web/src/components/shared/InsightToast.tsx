"use client";

import { useState } from "react";
import { Lightbulb, Copy, Check, X } from "lucide-react";
import type { Insight } from "@/lib/insights";

const COR_MAP: Record<string, { bg: string; border: string; icon: string; accent: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500", accent: "bg-blue-500 hover:bg-blue-600" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", icon: "text-orange-500", accent: "bg-orange-500 hover:bg-orange-600" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-500", accent: "bg-green-500 hover:bg-green-600" },
  red: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-500", accent: "bg-red-500 hover:bg-red-600" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-500", accent: "bg-purple-500 hover:bg-purple-600" },
};

interface InsightToastProps {
  insight: Insight;
  onClose: () => void;
  onAction?: () => void;
}

export function InsightToast({ insight, onClose, onAction }: InsightToastProps) {
  const [copied, setCopied] = useState(false);
  const colors = COR_MAP[insight.cor] ?? COR_MAP.blue;

  const handleAction = () => {
    if (insight.copiavel) {
      navigator.clipboard.writeText(insight.copiavel);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (onAction) {
      onAction();
    }
  };

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 relative animate-in slide-in-from-bottom-2 fade-in duration-300`}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb className={`h-3.5 w-3.5 ${colors.icon}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.icon}`}>
          Dica da metodologia
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-foreground mb-1">{insight.titulo}</h4>

      {/* Text */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{insight.texto}</p>

      {/* Action button */}
      {insight.acao && (
        <button
          onClick={handleAction}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors ${colors.accent}`}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copiado!
            </>
          ) : (
            <>
              {insight.copiavel ? <Copy className="h-3 w-3" /> : null}
              {insight.acao}
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Inline banner version (for sidebar) ────────────────────────────

interface InsightBannerProps {
  insight: Insight;
  onAction?: () => void;
}

export function InsightBanner({ insight, onAction }: InsightBannerProps) {
  const colors = COR_MAP[insight.cor] ?? COR_MAP.blue;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
      <div className="flex items-start gap-2">
        <Lightbulb className={`h-4 w-4 shrink-0 mt-0.5 ${colors.icon}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-foreground">{insight.titulo}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.texto}</p>
          {insight.acao && onAction && (
            <button
              onClick={onAction}
              className={`mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-white ${colors.accent}`}
            >
              {insight.acao}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
