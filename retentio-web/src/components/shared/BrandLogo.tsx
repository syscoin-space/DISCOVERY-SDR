"use client";

import { useBrand } from "@/hooks/use-brand";
import { useAuthStore } from "@/lib/stores/auth.store";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  // Overrides for real-time preview
  colorAccent?: string;
  colorNavy?: string;
  colorGreen?: string;
  logoUrl?: string;
}

const sizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export function BrandLogo({ 
  size = "md", 
  showName = true,
  colorAccent: overrideAccent,
  colorNavy: overrideNavy,
  colorGreen: overrideGreen,
  logoUrl: overrideLogo,
}: BrandLogoProps) {
  const { data: brand } = useBrand();
  const { user } = useAuthStore();

  const productName = "Discovery SDR";
  const subText = brand?.app_name || user?.tenant?.name;
  const logoUrl = overrideLogo ?? brand?.logo_url;
  const sizeClass = sizes[size];
  const accent = overrideAccent ?? brand?.color_accent ?? "#2E86AB";
  const navy = overrideNavy ?? brand?.color_navy ?? "#1E3A5F";
  const green = overrideGreen ?? brand?.color_green ?? "#1A7A5E";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={productName}
            className={`${size === "sm" ? "h-6" : size === "lg" ? "h-10" : "h-8"} w-auto object-contain shrink-0`}
          />
        ) : (
          <div
            className={`${sizeClass} flex items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm shrink-0`}
            style={{
              background: `linear-gradient(135deg, ${accent}, ${green})`,
            }}
          >
            {productName.charAt(0).toUpperCase()}
          </div>
        )}
        
        {showName && (
          <div className="flex flex-col leading-tight min-w-0">
            <span
              className={`font-bold tracking-tight text-foreground truncate ${size === "sm" ? "text-xs" : "text-sm"}`}
              style={{ color: navy }}
            >
              {productName}
            </span>
            {subText && (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate opacity-70">
                {subText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
