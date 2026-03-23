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

  const tenantName = user?.tenant?.name;
  const productName = "Discovery SDR";
  const logoUrl = overrideLogo ?? brand?.logo_url;
  const sizeClass = sizes[size];
  const accent = overrideAccent ?? brand?.color_accent ?? "#2E86AB";
  const navy = overrideNavy ?? brand?.color_navy ?? "#1E3A5F";
  const green = overrideGreen ?? brand?.color_green ?? "#1A7A5E";

  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <div className="flex flex-col">
          <img
            src={logoUrl}
            alt={productName}
            className="h-8 w-auto object-contain"
          />
          {showName && tenantName && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mt-1 pl-1">
              {tenantName}
            </span>
          )}
        </div>
      ) : (
        <>
          <div
            className={`${sizeClass} flex items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm`}
            style={{
              background: `linear-gradient(135deg, ${accent}, ${green})`,
            }}
          >
            {productName.charAt(0)}
          </div>
          {showName && (
            <div className="flex flex-col leading-tight">
              <span
                className="text-sm font-bold tracking-tight text-foreground"
                style={{ color: navy }}
              >
                {productName}
              </span>
              {tenantName && (
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {tenantName}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
