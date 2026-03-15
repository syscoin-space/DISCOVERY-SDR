"use client";

import { useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";

interface ImageUploadZoneProps {
  label: string;
  hint?: string;
  currentUrl: string | null;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
}

export function ImageUploadZone({
  label,
  hint,
  currentUrl,
  uploading,
  onUpload,
  onRemove,
  accept = "image/*",
  maxSizeMB = 2,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
        return;
      }
      onUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onUpload, maxSizeMB],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
        return;
      }
      onUpload(file);
    },
    [onUpload, maxSizeMB],
  );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-raised/50 p-4 transition-colors hover:border-accent hover:bg-accent/5"
      >
        {uploading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        ) : currentUrl ? (
          <div className="relative">
            <img
              src={currentUrl}
              alt={label}
              className="h-16 w-16 rounded-lg object-contain"
            />
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white text-xs hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">
              Clique ou arraste
            </span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
