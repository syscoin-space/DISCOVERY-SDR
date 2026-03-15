"use client";

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { ArrowLeft, Bell, Pencil, Check } from "lucide-react";
import {
  isPushSupported,
  getPushPermission,
  registerPushNotifications,
  unregisterPushNotifications,
} from "@/lib/push";

interface StoredUser {
  name: string;
  role: string;
  email: string;
}

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StoredUser | null;
}

export function AccountSheet({ open, onOpenChange, user }: AccountSheetProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (user) setNameValue(user.name);
  }, [user]);

  useEffect(() => {
    if (open && isPushSupported()) {
      setPushEnabled(getPushPermission() === "granted");
    }
  }, [open]);

  const handleSaveName = () => {
    if (nameValue.trim()) {
      try {
        const raw = localStorage.getItem("retentio_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.name = nameValue.trim();
          localStorage.setItem("retentio_user", JSON.stringify(parsed));
        }
      } catch {}
    }
    setEditingName(false);
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unregisterPushNotifications();
        setPushEnabled(false);
      } else {
        const ok = await registerPushNotifications();
        setPushEnabled(ok);
      }
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] flex flex-col rounded-t-2xl bg-surface outline-none max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground active:bg-surface-raised"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Drawer.Title className="text-sm font-bold text-foreground">
              Minha Conta
            </Drawer.Title>
          </div>

          <div className="overflow-y-auto px-4 py-4 pb-safe space-y-4">
            {/* Info section */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Informações
              </p>
              <div className="rounded-xl border border-border bg-surface-raised/50 divide-y divide-border">
                {/* Name - editable */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      Nome completo
                    </p>
                    {editingName ? (
                      <input
                        type="text"
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        autoFocus
                        className="w-full rounded-md border border-accent bg-surface px-2 py-1 text-sm text-foreground focus:outline-none"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        {nameValue || user?.name || "..."}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={editingName ? handleSaveName : () => setEditingName(true)}
                    className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-surface transition-colors"
                  >
                    {editingName ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Email - readonly */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    Email
                  </p>
                  <p className="text-sm text-foreground">
                    {user?.email ?? "..."}
                  </p>
                </div>

                {/* Role */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    Cargo / Role
                  </p>
                  <p className="text-sm text-foreground">
                    {user?.role ?? "SDR"}
                  </p>
                </div>
              </div>
            </div>

            {/* System section */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Sistema
              </p>
              <div className="rounded-xl border border-border bg-surface-raised/50 divide-y divide-border">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground">Versão do app</p>
                    <p className="text-xs text-muted-foreground">v1.0.0</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Discovery SDR by Retentio
                  </p>
                </div>

                {/* Push notifications */}
                {isPushSupported() && (
                  <button
                    onClick={handleTogglePush}
                    disabled={pushLoading}
                    className="flex w-full items-center justify-between px-4 py-3.5 active:bg-surface transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-foreground" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          Notificações push
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Toque para gerenciar
                        </p>
                      </div>
                    </div>
                    <div
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        pushEnabled ? "bg-accent" : "bg-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          pushEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
