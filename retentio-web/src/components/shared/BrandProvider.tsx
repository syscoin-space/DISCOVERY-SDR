"use client";

import { useEffect } from "react";
import { useBrand } from "@/hooks/use-brand";

/**
 * Applies brand colors as CSS variables on :root so the entire app
 * picks them up via the existing Tailwind theme tokens.
 * Also updates favicon and manifest link dynamically.
 */
export function BrandProvider() {
  const { data: brand } = useBrand();

  useEffect(() => {
    if (!brand) return;

    const root = document.documentElement;

    // Light-mode accent colors
    root.style.setProperty("--accent", brand.color_accent);
    root.style.setProperty("--ring", brand.color_accent);
    root.style.setProperty("--sidebar-primary", brand.color_accent);
    root.style.setProperty("--sidebar-ring", brand.color_accent);
    root.style.setProperty("--navy", brand.color_navy);
    root.style.setProperty("--green", brand.color_green);

    // Compute accent-hover (darken by 15%)
    const accentHover = darkenHex(brand.color_accent || "#4F46E5", 15);
    root.style.setProperty("--accent-hover", accentHover);

    // Update document title
    document.title = `${brand.app_name} — CRM de Prospecção`;

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

function darkenHex(hex: string, percent: number): string {
  if (!hex || typeof hex !== 'string') return "#000000";
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - percent / 100)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - percent / 100)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
