"use client";

import { useBrand } from "@/hooks/use-brand";
import { useAuthStore } from "@/lib/stores/auth.store";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const sizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export function BrandLogo({ size = "md", showName = true }: BrandLogoProps) {
  const { data: brand } = useBrand();
  const { user } = useAuthStore(); // Usar store para pegar nome real do tenant

  const tenantName = user?.tenant?.name;
  const appName = tenantName || brand?.app_name || "Discovery SDR";
  const logoUrl = brand?.logo_url;
  const sizeClass = sizes[size];

  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={appName}
          className="object-contain"
          style={{ width: 200, height: 70, borderRadius: 8 }}
        />
      ) : (
        <>
          <div
            className={`${sizeClass} flex items-center justify-center rounded-lg text-sm font-bold text-white`}
            style={{
              background: `linear-gradient(135deg, ${brand?.color_accent ?? "#2E86AB"}, ${brand?.color_green ?? "#1A7A5E"})`,
            }}
          >
            {appName.charAt(0).toUpperCase()}
          </div>
          {showName && (
            <span
              className="text-base font-semibold dark:text-gray-100"
              style={{ color: brand?.color_navy ?? "#1E3A5F" }}
            >
              {appName}
            </span>
          )}
        </>
      )}
    </div>
  );
}
