"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import api from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  importados: number;
  duplicatas: number;
  erros: number;
  total: number;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.name.endsWith(".csv") ||
        selectedFile.name.endsWith(".xlsx") ||
        selectedFile.type === "text/csv" ||
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Formato de arquivo inválido. Use .csv ou .xlsx");
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post<ImportResult>("/leads/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err: any) {
      console.error("Erro no upload:", err);
      setError(
        err.response?.data?.message || err.message || "Erro desconhecido ao importar arquivo"
      );
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setUploading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Pequeno delay para resetar após animação
    setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
          <DialogDescription>
            Suba uma planilha (.csv ou .xlsx) para importar seus leads.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 transition-colors hover:bg-gray-100"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-accent">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-700">Clique para selecionar ou arraste aqui</p>
                <p className="mt-1 text-xs text-gray-500">CSV ou Excel (XLSX) até 10MB</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv, .xlsx"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Importação Concluída</h3>
              <p className="text-sm text-gray-500">O processamento da planilha foi finalizado.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase">Sucesso</p>
                <p className="mt-1 text-2xl font-bold text-accent">{result.importados}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase">Duplicatas</p>
                <p className="mt-1 text-2xl font-bold text-amber-500">{result.duplicatas}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase">Erros</p>
                <p className="mt-1 text-2xl font-bold text-red-500">{result.erros}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center border border-blue-100">
                <p className="text-sm font-medium text-accent uppercase">Total</p>
                <p className="mt-1 text-2xl font-bold text-navy">{result.total}</p>
              </div>
            </div>
            
            <p className="text-[10px] text-center text-gray-400 italic">
              O PRR dos novos leads está sendo calculado em segundo plano.
            </p>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={uploading}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || uploading}
                className="bg-accent hover:bg-accent-hover min-w-[100px]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando
                  </>
                ) : (
                  "Importar"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full bg-navy hover:bg-navy/90">
              Concluído
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
