"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useBrand } from "@/hooks/use-brand";
import { useUnreadCount } from "@/hooks/use-notifications";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ProfileSheet } from "./ProfileSheet";

interface StoredUser {
  name: string;
  role: string;
  email: string;
  avatar_url?: string | null;
}

export function MobileHeader() {
  const { data: brand } = useBrand();
  const unreadCount = useUnreadCount();
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("retentio_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const appName = brand?.app_name ?? "Retentio";
  const logoUrl = brand?.logo_url;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden">
        <div className="pt-safe" />
        <div className="flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="object-contain"
                style={{ height: 28, width: "auto", maxWidth: 140, borderRadius: 4 }}
              />
            ) : (
              <>
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${brand?.color_accent ?? "#2E86AB"}, ${brand?.color_green ?? "#1A7A5E"})`,
                  }}
                >
                  {appName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  {appName}
                </span>
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Notification bell */}
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-surface-raised"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <button
              onClick={() => setProfileOpen(true)}
              className="transition-transform active:scale-95"
            >
              <UserAvatar
                name={user?.name ?? ""}
                avatarUrl={user?.avatar_url}
                size="md"
              />
            </button>
          </div>
        </div>
      </header>

      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
      />
    </>
  );
}
