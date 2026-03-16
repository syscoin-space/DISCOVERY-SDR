"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, MessageCircle, Phone, Linkedin, ExternalLink } from "lucide-react";
import { useTouchpoints } from "@/hooks/use-touchpoints";

const CHANNEL_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  EMAIL: { icon: Mail, color: "text-blue-500 border-blue-500/30 bg-blue-500/10" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-500 border-green-500/30 bg-green-500/10" },
  LIGACAO: { icon: Phone, color: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  LINKEDIN: { icon: Linkedin, color: "text-blue-700 border-blue-700/30 bg-blue-700/10" },
};

export function TouchpointTimeline({ leadId }: { leadId: string }) {
  const { data: touchpoints } = useTouchpoints(leadId);

  if (!touchpoints || touchpoints.length === 0) {
    return <p className="text-center py-6 text-sm text-muted-foreground italic">Nenhum touchpoint registrado</p>;
  }

  return (
    <div className="space-y-3">
      {touchpoints.map((t: any) => {
        const cfg = CHANNEL_ICONS[t.channel] ?? { icon: ExternalLink, color: "text-gray-500 border-gray-500/30 bg-gray-500/10" };
        const Icon = cfg.icon;
        return (
          <div key={t.id} className="relative pl-8 border-l-2 border-border pb-4 last:pb-0">
            <div className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border ${cfg.color}`}>
              <Icon className="h-3 w-3" />
            </div>
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{t.channel}</span>
                {t.outcome && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">{t.outcome}</span>}
              </div>
              <span className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
            </div>
            {t.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default TouchpointTimeline;
