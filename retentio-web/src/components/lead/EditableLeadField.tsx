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
}: EditableLeadFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const updateLead = useUpdateLead();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isSavingRef = useRef(false);
  const { toast } = useToast();

  const handleSave = useCallback(async () => {
    // 1. Evitar save duplicado ou se o valor não mudou
    if (isSavingRef.current || !editing) return;
    
    const normalizedValue = editValue.trim();
    const originalValue = (value ?? "").trim();

    if (normalizedValue === originalValue) {
      setEditing(false);
      return;
    }

    // 2. Validação simples (pode ser expandida conforme a necessidade)
    // Se o campo for obrigatório camuflado ou tiver formato específico, validar aqui.
    // Para campos gerais, só evitamos salvar lixo se necessário.

    isSavingRef.current = true;
    try {
      await updateLead.mutateAsync({
        leadId,
        payload: { [field]: normalizedValue || null },
      });
      // 3. Após sucesso, sair corretamente do modo de edição
      setEditing(false);
    } catch (err) {
      // 4. Rollback em erro
      toast(`Erro ao salvar ${label}. O valor original foi restaurado.`, "error");
      setEditValue(value ?? "");
      setEditing(false);
    } finally {
      isSavingRef.current = false;
    }
  }, [editValue, value, field, leadId, updateLead, editing, label, toast]);

  const handleCancel = useCallback(() => {
    setEditValue(value ?? "");
    setEditing(false);
  }, [value]);

  useEffect(() => {
    if (openOnMount && !editing) {
      setEditValue(value ?? "");
      setEditing(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOnMount, leadId]);

  // Sincronizar editValue se o valor externo mudar (ex: reload)
  useEffect(() => {
    if (!editing) {
      setEditValue(value ?? "");
    }
  }, [value, editing]);

  if (editing) {
    return (
      <div className={`w-full ${className}`}>
        <label className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block truncate">
          {label}
        </label>
        <div className="flex items-center gap-1.5 mt-1 w-full relative">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            onBlur={() => {
              // Delay suave para não conflitar com Enter/Esc
              setTimeout(() => handleSave(), 100);
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
        setTimeout(() => inputRef.current?.focus(), 50);
      }}
    >
      <label className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block truncate">
        {label}
      </label>
      <div className="flex items-center gap-1.5 mt-1 w-full relative">
        <p className="text-sm font-medium text-foreground truncate min-w-0">
          {value || <span className="text-muted-foreground italic">{placeholder}</span>}
        </p>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </div>
  );
}
