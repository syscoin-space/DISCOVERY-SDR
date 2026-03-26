import React, { useState, useCallback, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { useUpdateLead } from "@/hooks/use-leads";

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

  const handleSave = useCallback(async () => {
    if (editValue !== (value ?? "")) {
      await updateLead.mutateAsync({
        leadId,
        payload: { [field]: editValue || null },
      });
    }
    setEditing(false);
  }, [editValue, value, field, leadId, updateLead]);

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

  if (editing) {
    return (
      <div className={`w-full ${className}`}>
        <label className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block truncate">
          {label}
        </label>
        <div className="flex items-center gap-1.5 mt-1 w-full">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            autoFocus
            className="flex-1 min-w-0 rounded-md border border-accent/40 bg-surface-raised px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
          />
          <button
            onClick={handleSave}
            disabled={updateLead.isPending}
            className="text-green-500 hover:text-green-600 p-1 shrink-0 rounded hover:bg-green-500/10 transition-colors disabled:opacity-50"
            title="Salvar (Enter)"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={updateLead.isPending}
            className="text-red-400 hover:text-red-500 p-1 shrink-0 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Cancelar (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
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
