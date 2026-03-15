"use client";

import { useState, useEffect } from "react";
import { useBrand, useUpdateBrand, useUploadBrandImage, useResetBrand } from "@/hooks/use-brand";
import { ImageUploadZone } from "@/components/shared/ImageUploadZone";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Palette, RotateCcw, Save, Eye } from "lucide-react";

export default function MarcaPage() {
  const { data: brand, isLoading } = useBrand();
  const updateBrand = useUpdateBrand();
  const uploadImage = useUploadBrandImage();
  const resetBrand = useResetBrand();

  const [appName, setAppName] = useState("");
  const [colorAccent, setColorAccent] = useState("#2E86AB");
  const [colorNavy, setColorNavy] = useState("#1E3A5F");
  const [colorGreen, setColorGreen] = useState("#1A7A5E");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (brand) {
      setAppName(brand.app_name);
      setColorAccent(brand.color_accent);
      setColorNavy(brand.color_navy);
      setColorGreen(brand.color_green);
    }
  }, [brand]);

  if (isLoading || !brand) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const handleSave = async () => {
    await updateBrand.mutateAsync({
      app_name: appName,
      color_accent: colorAccent,
      color_navy: colorNavy,
      color_green: colorGreen,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if (!confirm("Restaurar todas as configurações de marca para o padrão?")) return;
    await resetBrand.mutateAsync();
  };

  const handleUpload = (field: "logo" | "favicon" | "icon_192" | "icon_512") => (file: File) => {
    uploadImage.mutate({ field, file });
  };

  const hasChanges =
    appName !== brand.app_name ||
    colorAccent !== brand.color_accent ||
    colorNavy !== brand.color_navy ||
    colorGreen !== brand.color_green;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:px-6 lg:py-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Marca
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            Personalize a identidade visual do CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetBrand.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs lg:text-sm font-medium text-foreground
              shadow-sm transition-colors hover:border-danger hover:text-danger focus:ring-2 focus:ring-danger/50 outline-none disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateBrand.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium text-white
              shadow-sm transition-colors hover:bg-accent-hover focus:ring-2 focus:ring-accent/50 outline-none disabled:opacity-50"
          >
            {saved ? (
              <>Salvo!</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Salvar</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Live Preview */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </h2>
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-raised p-4">
              <BrandLogo size="lg" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: colorAccent }} title="Accent" />
                <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: colorNavy }} title="Navy" />
                <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: colorGreen }} title="Green" />
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Identidade</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nome do App</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                maxLength={30}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground
                  placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadZone
                label="Logo"
                hint="PNG ou SVG, max 2MB"
                currentUrl={brand.logo_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "logo"}
                onUpload={handleUpload("logo")}
              />
              <ImageUploadZone
                label="Favicon"
                hint="PNG 32x32 ou ICO"
                currentUrl={brand.favicon_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "favicon"}
                onUpload={handleUpload("favicon")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadZone
                label="Ícone PWA 192x192"
                hint="PNG 192x192"
                currentUrl={brand.icon_192_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "icon_192"}
                onUpload={handleUpload("icon_192")}
              />
              <ImageUploadZone
                label="Ícone PWA 512x512"
                hint="PNG 512x512"
                currentUrl={brand.icon_512_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "icon_512"}
                onUpload={handleUpload("icon_512")}
              />
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Cores</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ColorPicker
                label="Cor Principal (Accent)"
                value={colorAccent}
                onChange={setColorAccent}
                description="Botões, links, destaques"
              />
              <ColorPicker
                label="Cor Navy"
                value={colorNavy}
                onChange={setColorNavy}
                description="Textos de marca, títulos"
              />
              <ColorPicker
                label="Cor Green"
                value={colorGreen}
                onChange={setColorGreen}
                description="Sucesso, gradientes"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  description: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <p className="text-[10px] text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-mono text-foreground
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent uppercase"
        />
      </div>
    </div>
  );
}
