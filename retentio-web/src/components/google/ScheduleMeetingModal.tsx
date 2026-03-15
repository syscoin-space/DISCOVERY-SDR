"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Loader2, Clock } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  useGoogleStatus,
  useCloserAvailability,
  useCreateCalendarEvent,
} from "@/hooks/use-google";

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadEmail?: string | null;
  companyName: string;
  contactName?: string | null;
  onScheduled?: () => void;
}

export function ScheduleMeetingModal({
  open,
  onOpenChange,
  leadId,
  leadEmail,
  companyName,
  contactName,
  onScheduled,
}: ScheduleMeetingModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { data: googleStatus } = useGoogleStatus();

  const [titulo, setTitulo] = useState(
    `Reunião — ${companyName}`,
  );
  const [descricao, setDescricao] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [criarMeet, setCriarMeet] = useState(true);
  const [convidados, setConvidados] = useState(leadEmail ?? "");

  const closerUserId = user?.id ?? "";

  const { data: slots, isLoading: loadingSlots } = useCloserAvailability(
    closerUserId,
    selectedDate,
    duration,
  );

  const createEvent = useCreateCalendarEvent();

  const freeSlots = useMemo(
    () => slots?.filter((s) => s.livre) ?? [],
    [slots],
  );

  function handleSchedule() {
    if (!selectedSlot) return;

    const inicio = selectedSlot;
    const fim = new Date(
      new Date(inicio).getTime() + duration * 60000,
    ).toISOString();

    const convidadosArray = convidados
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    createEvent.mutate(
      {
        leadId,
        closerUserId,
        titulo,
        descricao: descricao || undefined,
        inicio,
        fim,
        convidados: convidadosArray,
        criarMeet,
      },
      {
        onSuccess: (data) => {
          const msg = data.meetLink
            ? "Reunião agendada com Google Meet!"
            : "Reunião agendada!";
          toast(msg);
          onOpenChange(false);
          onScheduled?.();
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ?? "Erro ao agendar reunião";
          toast(msg, "error");
        },
      },
    );
  }

  const isGoogleConnected = googleStatus?.connected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-500" />
            Agendar reunião
          </DialogTitle>
          <DialogDescription>
            {companyName}
            {contactName ? ` — ${contactName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!isGoogleConnected ? (
          <div className="text-center py-6 space-y-3">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Google nas{" "}
              <a
                href="/configuracoes"
                className="text-accent underline hover:text-accent-hover"
              >
                Configurações
              </a>{" "}
              para agendar reuniões.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Date + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Data
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Duração
                </label>
                <select
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value));
                    setSelectedSlot(null);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value={30}>30 min</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            </div>

            {/* Available Slots */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                <Clock className="inline h-3 w-3 mr-1" />
                Horários livres
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Consultando agenda...
                  </span>
                </div>
              ) : freeSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum horário livre neste dia.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[180px] overflow-y-auto">
                  {freeSlots.map((slot) => {
                    const time = format(
                      new Date(slot.inicio),
                      "HH:mm",
                      { locale: ptBR },
                    );
                    const isSelected = selectedSlot === slot.inicio;
                    return (
                      <button
                        key={slot.inicio}
                        type="button"
                        onClick={() => setSelectedSlot(slot.inicio)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-foreground hover:border-accent/50 hover:bg-surface-raised"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Convidados */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Convidados (emails separados por vírgula)
              </label>
              <input
                type="text"
                value={convidados}
                onChange={(e) => setConvidados(e.target.value)}
                placeholder="email@empresa.com"
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Descrição (opcional)
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                placeholder="Pauta da reunião..."
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none resize-y"
              />
            </div>

            {/* Google Meet toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={criarMeet}
                onClick={() => setCriarMeet(!criarMeet)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  criarMeet ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    criarMeet ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
              <Video className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">
                Criar link Google Meet
              </span>
            </label>
          </div>
        )}

        {isGoogleConnected && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={
                !selectedSlot || !titulo.trim() || createEvent.isPending
              }
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {createEvent.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Agendar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
