import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLeadHistory } from "@/hooks/use-leads";
import { Activity, ArrowRight, UserCircle } from "lucide-react";

export function LeadHistoryTimeline({ leadId }: { leadId: string }) {
  const { data: history, isLoading } = useLeadHistory(leadId);

  if (isLoading) {
    return (
      <div className="flex animate-pulse space-y-4 flex-col py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-full bg-surface-raised rounded-md" />
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-center py-4 text-sm text-muted-foreground italic">
        Nenhuma movimentação registrada
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((log) => {
        const oldStatus = log.old_value?.status?.replace(/_/g, " ") ?? "—";
        const newStatus = log.new_value?.status?.replace(/_/g, " ") ?? "—";
        
        return (
          <div key={log.id} className="relative pl-6 border-l-2 border-border pb-4 last:pb-0">
            <div className="absolute -left-[11px] top-1">
              <div className="h-5 w-5 rounded-full border border-border bg-surface-raised flex items-center justify-center">
                <Activity className="h-3 w-3 text-accent" />
              </div>
            </div>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-accent/10 px-1.5 py-0.5 rounded">
                    {oldStatus}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                    {newStatus}
                  </span>
                </div>
                {log.user && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-4 w-4 bg-accent/20 text-accent rounded-full flex justify-center items-center text-[8px] overflow-hidden">
                      {log.user.avatar_url ? (
                        <img src={log.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        log.user.name.charAt(0)
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Movido por <span className="font-medium text-foreground">{log.user.name}</span>
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
