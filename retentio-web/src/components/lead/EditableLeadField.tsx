import React, { useState, useCallback, useRef, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { useUpdateLead } from "@/hooks/use-leads";
import { useToast } from "@/components/shared/Toast";

interface EditableLeadFieldProps {
  label: string;
  value: string | null | undefined;
  field: string;
  leadId: string;
  type?: string;
  placeholder?: string;
  className?: string;
  openOnMount?: boolean;
  /** Exibe como título h1 grande (ex: nome da empresa no header) */
  titleMode?: boolean;
}

export function EditableLeadField({
  label,
  value,
  field,
  leadId,
  type = "text",
  placeholder = "Não informado",
  className = "",
  openOnMount = false,
  titleMode = false,
}: EditableLeadFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const updateLead = useUpdateLead();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isSavingRef = useRef(false);
  // Refs espelho para evitar stale closures nos callbacks de timer
  const editingRef = useRef(false);
  const editValueRef = useRef(editValue);
  const { toast } = useToast();

  // Mantém as refs sempre sincronizadas com o estado
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    editValueRef.current = editValue;
  }, [editValue]);

  const handleSave = useCallback(async () => {
    // Usa refs para ler o estado atual — evita stale closures em setTimeout
    if (isSavingRef.current || !editingRef.current) return;

    const normalizedValue = editValueRef.current.trim();
    const originalValue = (value ?? "").trim();

    if (normalizedValue === originalValue) {
      setEditing(false);
      editingRef.current = false;
      return;
    }

    isSavingRef.current = true;
    setEditing(false);
    editingRef.current = false;

    try {
      await updateLead.mutateAsync({
        leadId,
        payload: { [field]: normalizedValue || null },
      });
    } catch (err) {
      toast(`Erro ao salvar ${label || field}. O valor original foi restaurado.`, "error");
      setEditValue(value ?? "");
    } finally {
      isSavingRef.current = false;
    }
  }, [value, field, leadId, updateLead, label, toast]);

  const handleCancel = useCallback(() => {
    setEditValue(value ?? "");
    setEditing(false);
    editingRef.current = false;
  }, [value]);

  useEffect(() => {
    if (openOnMount && !editing) {
      setEditValue(value ?? "");
      setEditing(true);
      editingRef.current = true;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOnMount, leadId]);

  // Sincronizar editValue se o valor externo mudar (ex: reload)
  useEffect(() => {
    if (!editing) {
      setEditValue(value ?? "");
      editValueRef.current = value ?? "";
    }
  }, [value, editing]);

  // ── titleMode: aparência de h1 editável no header ────────────────
  if (titleMode) {
    if (editing) {
      return (
        <div className={`relative flex items-center ${className}`}>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              editValueRef.current = e.target.value;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSave(); }
              if (e.key === "Escape") handleCancel();
            }}
            onBlur={() => setTimeout(() => handleSave(), 150)}
            autoFocus
            disabled={updateLead.isPending}
            style={{ minWidth: "8ch", width: `${Math.max(editValue.length, 8)}ch` }}
            className="text-xl font-bold text-foreground bg-transparent border-b-2 border-accent outline-none focus:border-accent pr-6 transition-all"
          />
          {updateLead.isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-accent ml-1.5 shrink-0" />
          )}
        </div>
      );
    }

    return (
      <div
        className={`group flex items-center gap-1.5 cursor-pointer ${className}`}
        onClick={() => {
          setEditValue(value ?? "");
          setEditing(true);
          editingRef.current = true;
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        title="Clique para editar"
      >
        <h1 className="text-xl font-bold text-foreground">
          {value || <span className="text-muted-foreground italic font-normal">{placeholder}</span>}
        </h1>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    );
  }

  // ── modo normal: label + campo ───────────────────────────────────
  if (editing) {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block truncate">
            {label}
          </label>
        )}
        <div className="flex items-center gap-1.5 mt-1 w-full relative">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              editValueRef.current = e.target.value;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") handleCancel();
            }}
            onBlur={() => {
              // Delay suave para não conflitar com cliques no botão Salvar
              setTimeout(() => handleSave(), 150);
            }}
            autoFocus
            disabled={updateLead.isPending}
            className="flex-1 min-w-0 rounded-md border border-accent/40 bg-surface-raised px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all pr-8"
          />
          {updateLead.isPending && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group cursor-pointer w-full overflow-hidden ${className}`}
      onClick={() => {
        setEditValue(value ?? "");
        setEditing(true);
        editingRef.current = true;
        setTimeout(() => inputRef.current?.focus(), 50);
      }}
    >
      {label && (
        <label className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block truncate">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1.5 mt-1 w-full relative">
        <p className="text-sm font-medium text-foreground truncate min-w-0">
          {value || <span className="text-muted-foreground italic">{placeholder}</span>}
        </p>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </div>
  );
}
