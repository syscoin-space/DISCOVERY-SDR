"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin, CalendarPlus, Check } from "lucide-react";
import { useState, useMemo } from "react";
import type { Lead } from "@/lib/types";
import { PotentialScoreBadge } from "@/components/shared/PotentialScoreBadge";
import { ICPBadge } from "@/components/shared/ICPBadge";
import { IntegrabilityBadge } from "@/components/shared/IntegrabilityBadge";
import { ChannelIcons } from "@/components/shared/ChannelIcons";
import { useAddToToday } from "@/hooks/use-today";
import { getNextChannelSuggestion } from "@/lib/insights";

interface LeadCardProps {
  lead: Lead;
  onSelect: (leadId: string) => void;
}

export function LeadCard({ lead, onSelect }: LeadCardProps) {
  const addToToday = useAddToToday();
  const [addedToday, setAddedToday] = useState(false);

  const nextChannel = useMemo(
    () => lead.interactions?.length ? getNextChannelSuggestion(lead.interactions as any) : null,
    [lead.interactions]
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isAlert = lead.bloqueio_status === "ALERTA";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(lead.id)}
      className={`
        w-[260px] cursor-pointer rounded-xl border bg-surface p-4
        shadow-sm transition-all duration-200
        hover:shadow-md hover:border-accent/30
        dark:bg-surface dark:border-border/50
        ${isDragging ? "opacity-50 shadow-xl ring-2 ring-accent" : "border-border"}
        ${isAlert ? "border-l-2 border-l-orange-500" : ""}
      `}
    >
      {/* Alerta badge */}
      {isAlert && (
        <span className="mb-2 inline-block rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
          Alerta
        </span>
      )}

      {/* LINHA 1: Empresa + Nicho */}
      <div className="flex items-start justify-between gap-1">
        <h4 className="truncate text-sm font-semibold text-foreground">
          {lead.company_name}
        </h4>
      </div>
      {lead.niche && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.niche}</p>
      )}

      {/* LINHA 2: PRR + ICP */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PotentialScoreBadge tier={lead.fit_tier} score={lead.operational_score} />
        <ICPBadge score={lead.icp_score} />
      </div>

      {/* LINHA 3: Plataforma + Integrabilidade */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {lead.ecommerce_platform && (
          <span className="inline-flex items-center rounded-md bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">
            {lead.ecommerce_platform}
          </span>
        )}
        <IntegrabilityBadge level={lead.integrability} />
      </div>

      {/* Separador */}
      <div className="my-2 border-t border-border/50" />

      {/* LINHA 4: Canais + Hoje */}
      <div className="flex items-center justify-between">
        <ChannelIcons
          whatsapp={lead.whatsapp}
          email={lead.email}
          instagram={lead.instagram_handle}
          linkedin={lead.linkedin_url}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (addedToday || addToToday.isPending) return;
            addToToday.mutate(
              { lead_id: lead.id },
              {
                onSuccess: () => setAddedToday(true),
              }
            );
          }}
          disabled={addedToday || addToToday.isPending}
          title={addedToday ? "Adicionado à fila de hoje" : "+ Hoje"}
          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            addedToday
              ? "text-green-600 bg-green-500/10"
              : "text-muted-foreground hover:text-accent hover:bg-accent/10"
          }`}
        >
          {addedToday ? <Check size={12} /> : <CalendarPlus size={12} />}
          {addedToday ? "Adicionado" : "Hoje"}
        </button>
      </div>

      {/* Channel suggestion */}
      {nextChannel && (
        <p className="mt-1 text-[10px] text-accent font-medium">
          Próx: {nextChannel}
        </p>
      )}

      {/* LINHA 5: Localização */}
      {(() => {
        const invalidValues = ["N/A", "n/a", "Não encontrado", "Desconhecido", "null", "undefined", "\u2014", "-", ""];
        const isValid = (val: string | null | undefined) =>
          !!val && !invalidValues.includes(val.trim());
        const city = isValid(lead.city) ? lead.city : null;
        const state = isValid(lead.state) ? lead.state : null;
        if (!city && !state) return null;
        return (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">
              {city}{city && state ? " \u00B7 " : ""}{state}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
