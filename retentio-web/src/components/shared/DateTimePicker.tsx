"use client";

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { CalendarPlus, Clock, X } from "lucide-react";

interface DateTimePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string | null;
  onConfirm: (iso: string) => void;
  onClear?: () => void;
}

function roundToNext15(date: Date): Date {
  const ms = 15 * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function toLocalInput(d: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function buildShortcuts(): { label: string; value: () => Date }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  return [
    { label: "Em 1h", value: () => new Date(Date.now() + 60 * 60 * 1000) },
    { label: "Em 2h", value: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
    { label: "Hoje 14h", value: () => { const d = new Date(today); d.setHours(14, 0); return d; } },
    { label: "Hoje 16h", value: () => { const d = new Date(today); d.setHours(16, 0); return d; } },
    { label: "Amanhã 9h", value: () => { const d = new Date(tomorrow); d.setHours(9, 0); return d; } },
    { label: "Amanhã 14h", value: () => { const d = new Date(tomorrow); d.setHours(14, 0); return d; } },
  ];
}

function PickerContent({
  dateValue,
  setDateValue,
  timeValue,
  setTimeValue,
  onConfirm,
  onClear,
  hasExisting,
}: {
  dateValue: string;
  setDateValue: (v: string) => void;
  timeValue: string;
  setTimeValue: (v: string) => void;
  onConfirm: () => void;
  onClear?: () => void;
  hasExisting: boolean;
}) {
  const shortcuts = buildShortcuts();

  function applyShortcut(fn: () => Date) {
    const d = fn();
    const local = toLocalInput(d);
    setDateValue(local.date);
    setTimeValue(local.time);
  }

  return (
    <div className="space-y-4">
      {/* Shortcuts */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Atalhos
        </p>
        <div className="grid grid-cols-3 gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => applyShortcut(s.value)}
              className="rounded-lg border border-border bg-surface-raised px-2 py-2.5 text-xs font-medium text-foreground active:bg-accent/10 transition-colors lg:py-1.5"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date + Time inputs */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Data</label>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none lg:py-2"
          />
        </div>
        <div className="w-28">
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Hora</label>
          <input
            type="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none lg:py-2"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {hasExisting && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-red-500 active:bg-red-500/10 transition-colors lg:py-2"
          >
            Remover
          </button>
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!dateValue || !timeValue}
          className="flex-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 lg:py-2"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

export function DateTimePicker({ open, onOpenChange, value, onConfirm, onClear }: DateTimePickerProps) {
  const initial = value ? new Date(value) : roundToNext15(new Date());
  const localInit = toLocalInput(initial);
  const [dateValue, setDateValue] = useState(localInit.date);
  const [timeValue, setTimeValue] = useState(localInit.time);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
  }, []);

  useEffect(() => {
    if (open) {
      const d = value ? new Date(value) : roundToNext15(new Date());
      const local = toLocalInput(d);
      setDateValue(local.date);
      setTimeValue(local.time);
    }
  }, [open, value]);

  function handleConfirm() {
    if (!dateValue || !timeValue) return;
    const dt = new Date(`${dateValue}T${timeValue}`);
    onConfirm(dt.toISOString());
    onOpenChange(false);
  }

  function handleClear() {
    onClear?.();
    onOpenChange(false);
  }

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-surface outline-none">
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <Drawer.Title className="px-4 pb-2 text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-accent" />
              Agendar contato
            </Drawer.Title>
            <div className="px-4 pb-safe">
              <PickerContent
                dateValue={dateValue}
                setDateValue={setDateValue}
                timeValue={timeValue}
                setTimeValue={setTimeValue}
                onConfirm={handleConfirm}
                onClear={handleClear}
                hasExisting={!!value}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={() => onOpenChange(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute w-72 rounded-xl border border-border bg-surface p-4 shadow-lg"
        style={{ top: "var(--picker-top, 50%)", left: "var(--picker-left, 50%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-accent" />
            Agendar contato
          </p>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <PickerContent
          dateValue={dateValue}
          setDateValue={setDateValue}
          timeValue={timeValue}
          setTimeValue={setTimeValue}
          onConfirm={handleConfirm}
          onClear={handleClear}
          hasExisting={!!value}
        />
      </div>
    </div>
  );
}
