"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80 pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.type === "success" ? Check : t.type === "error" ? AlertCircle : Info;
          const colors =
            t.type === "success"
              ? "bg-emerald-600 text-white"
              : t.type === "error"
                ? "bg-red-600 text-white"
                : "bg-accent text-white";
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200 ${colors}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-sm font-medium">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
