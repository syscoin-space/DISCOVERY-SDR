"use client";

import { useState, useEffect } from "react";
import { useBrand, useUpdateBrand, useUploadBrandImage, useResetBrand } from "@/hooks/use-brand";
import { ImageUploadZone } from "@/components/shared/ImageUploadZone";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Palette, RotateCcw, Save, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/shared/Toast";

export default function BrandPage() {
  const { data: brand, isLoading } = useBrand();
  const updateBrand = useUpdateBrand();
  const uploadImage = useUploadBrandImage();
  const resetBrand = useResetBrand();
  const { toast } = useToast();

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
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await updateBrand.mutateAsync({
        app_name: appName,
        color_accent: colorAccent,
        color_navy: colorNavy,
        color_green: colorGreen,
      });
      setSaved(true);
      toast("Marca atualizada com sucesso!", "success");
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast("Erro ao atualizar marca.", "error");
    }
  };

  const handleReset = async () => {
    if (!confirm("Restaurar todas as configurações de marca para o padrão?")) return;
    try {
      await resetBrand.mutateAsync();
      toast("Marca restaurada para o padrão.", "info");
    } catch (error) {
      toast("Erro ao restaurar marca.", "error");
    }
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Marca</h2>
          <p className="text-muted-foreground">Personalize a identidade visual do seu portal.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetBrand.isPending}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateBrand.isPending}
            className="gap-2 px-6"
          >
            {saved ? "Salvo!" : (
              <>
                <Save className="h-4 w-4" />
                Salvar Marca
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Preview Section */}
        <Card className="border border-border bg-surface shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-surface/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-accent" />
              Preview em Tempo Real
            </CardTitle>
            <CardDescription>Como sua marca aparece no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-8 rounded-xl border border-border bg-surface-raised p-6 shadow-inner">
              <BrandLogo size="lg" />
              <div className="flex items-center gap-3">
                <div className="group relative">
                  <div className="h-10 w-10 rounded-full shadow-sm border border-border/50" style={{ backgroundColor: colorAccent }} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Accent</span>
                </div>
                <div className="group relative">
                  <div className="h-10 w-10 rounded-full shadow-sm border border-border/50" style={{ backgroundColor: colorNavy }} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Navy</span>
                </div>
                <div className="group relative">
                  <div className="h-10 w-10 rounded-full shadow-sm border border-border/50" style={{ backgroundColor: colorGreen }} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Green</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity Assets */}
        <Card className="border border-border bg-surface shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-surface/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent" />
              Ativos de Identidade
            </CardTitle>
            <CardDescription>Logos e ícones da sua empresa.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Nome Personalizado da Aplicação</Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Ex: Discovery SDR - Minha Empresa"
                className="max-w-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploadZone
                label="Logo Principal"
                hint="SVG ou PNG (fundo transparente)"
                currentUrl={brand.logo_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "logo"}
                onUpload={handleUpload("logo")}
              />
              <ImageUploadZone
                label="Favicon (Ícone do Navegador)"
                hint="PNG 32x32"
                currentUrl={brand.favicon_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "favicon"}
                onUpload={handleUpload("favicon")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/50 pt-6 mt-6">
              <ImageUploadZone
                label="Ícone PWA (192x192)"
                hint="Design quadrado"
                currentUrl={brand.icon_192_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "icon_192"}
                onUpload={handleUpload("icon_192")}
              />
              <ImageUploadZone
                label="Ícone PWA (512x512)"
                hint="Alta resolução"
                currentUrl={brand.icon_512_url}
                uploading={uploadImage.isPending && uploadImage.variables?.field === "icon_512"}
                onUpload={handleUpload("icon_512")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Palette */}
        <Card className="border border-border bg-surface shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-surface/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent" />
              Paleta de Cores
            </CardTitle>
            <CardDescription>Cores que compõem o tema do portal.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ColorPicker
                label="Principal (Accent)"
                value={colorAccent}
                onChange={setColorAccent}
                description="Botões e destaques"
              />
              <ColorPicker
                label="Fundo / Textos (Navy)"
                value={colorNavy}
                onChange={setColorNavy}
                description="Títulos e sidebar"
              />
              <ColorPicker
                label="Sucesso (Green)"
                value={colorGreen}
                onChange={setColorGreen}
                description="Status positivo"
              />
            </div>
          </CardContent>
        </Card>
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
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer scale-150 border-none bg-transparent"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
            }}
            maxLength={7}
            className="h-9 font-mono text-xs uppercase"
          />
          <p className="text-[10px] text-muted-foreground leading-none">{description}</p>
        </div>
      </div>
    </div>
  );
}
