"use client";

import { useEffect, Suspense } from "react";
import { useBrand } from "@/hooks/use-brand";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";

function BrandManager() {
  const searchParams = useSearchParams();
  const { tenantId, isHydrated } = useAuthStore();
  
  const slug = searchParams.get("tenant") || searchParams.get("s");
  
  const shouldFetch = !!slug || isHydrated;
  const identifier = slug || tenantId || undefined;
  
  const { data: brand } = useBrand(identifier, shouldFetch);

  useEffect(() => {
    if (!brand) return;

    const root = document.documentElement;

    // Core Brand Colors
    root.style.setProperty("--accent", brand.color_accent);
    root.style.setProperty("--ring", brand.color_accent);
    root.style.setProperty("--navy", brand.color_navy);
    root.style.setProperty("--green", brand.color_green);

    // Compute derived colors
    const accentHover = darkenHex(brand.color_accent || "#2E86AB", 10);
    const accentSoft = brand.color_accent + "1A"; // 10% opacity
    
    root.style.setProperty("--accent-hover", accentHover);
    root.style.setProperty("--accent-soft", accentSoft);

    // Sidebar & Navigation specific vars (Shadcn/Retentio sync)
    root.style.setProperty("--sidebar-primary", brand.color_accent);
    root.style.setProperty("--sidebar-ring", brand.color_accent);
    
    // Update document title and elements
    if (brand.app_name && brand.app_name !== "Discovery SDR") {
      document.title = `${brand.app_name} — Discovery SDR`;
    } else {
      document.title = "Discovery SDR — CRM de Prospecção";
    }

    // Update favicon if custom
    if (brand.favicon_url) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = brand.favicon_url;
    }

    // Update theme-color meta tag
    let meta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
    if (meta) {
      meta.content = brand.color_accent;
    }

    // Update apple-touch-icon
    if (brand.icon_192_url) {
      let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
      if (!appleIcon) {
        appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = brand.icon_192_url;
    }
  }, [brand]);

  return null;
}

export function BrandProvider() {
  return (
    <Suspense fallback={null}>
      <BrandManager />
    </Suspense>
  );
}

function darkenHex(hex: string, percent: number): string {
  if (!hex || typeof hex !== 'string') return "#000000";
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - percent / 100)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - percent / 100)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
