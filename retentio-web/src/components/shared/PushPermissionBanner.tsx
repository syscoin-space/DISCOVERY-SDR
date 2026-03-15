"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { isPushSupported, getPushPermission, registerPushNotifications } from "@/lib/push";

const DISMISS_KEY = "retentio_push_dismissed_at";
const DISMISS_DAYS = 7;

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    // Only show on client
    if (!isPushSupported()) return;

    const permission = getPushPermission();
    if (permission !== "default") return; // already granted or denied

    // Check dismiss cooldown
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // Only show if logged in
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setVisible(true);
  }, []);

  const handleActivate = async () => {
    setActivating(true);
    const success = await registerPushNotifications();
    setActivating(false);
    if (success) setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800 dark:bg-blue-950/50">
      <Bell className="h-4 w-4 text-blue-500 shrink-0" />
      <p className="text-sm text-blue-700 dark:text-blue-300">
        Ative notificações para não perder alertas de leads e cadências
      </p>
      <button
        onClick={handleActivate}
        disabled={activating}
        className="rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {activating ? "Ativando..." : "Ativar notificações"}
      </button>
      <button
        onClick={handleDismiss}
        className="text-blue-400 hover:text-blue-600 p-0.5"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
