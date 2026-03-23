"use client";

import { useState, useEffect } from "react";
import { 
  useBrand, 
  useUpdateBrand, 
  useUploadBrandImage, 
  useResetBrand 
} from "@/hooks/use-brand";
import { ImageUploadZone } from "@/components/shared/ImageUploadZone";
import { Button } from "@/components/ui/button";
import { Loader2, Palette, Smartphone, Image as ImageIcon, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      setAppName(brand.app_name || "");
      setColorAccent(brand.color_accent || "#2E86AB");
      setColorNavy(brand.color_navy || "#1E3A5F");
      setColorGreen(brand.color_green || "#1A7A5E");
    }
  }, [brand]);

  if (isLoading) {
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

  const handleUpload = async (field: "logo" | "favicon" | "icon_192" | "icon_512", file: File) => {
    try {
      await uploadImage.mutateAsync({ field, file });
      toast("Imagem atualizada com sucesso!", "success");
    } catch (error) {
      toast("Erro ao fazer upload da imagem.", "error");
    }
  };

  const handleReset = async () => {
    if (confirm("Tem certeza que deseja resetar para as cores e logos padrão?")) {
      await resetBrand.mutateAsync();
      toast("Marca resetada com sucesso!", "success");
    }
  };

  const hasChanges = 
    appName !== brand?.app_name ||
    colorAccent !== brand?.color_accent ||
    colorNavy !== brand?.color_navy ||
    colorGreen !== brand?.color_green;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Marca</h2>
          <p className="text-muted-foreground">Personalize a identidade visual do seu painel e comunicações.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            disabled={resetBrand.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Resetar Padrão
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={!hasChanges || updateBrand.isPending}
            className="gap-2"
          >
            {updateBrand.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "Salvo!" : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Ativos de Identidade */}
        <SettingsSection
          title="Ativos de Identidade"
          description="Logos e ícones da sua empresa."
          icon={ImageIcon}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Nome Personalizado da Aplicação</Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Ex: Discovery SDR - Minha Empresa"
                className="max-w-md bg-surface"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">Logo Principal (Modo Claro)</label>
                <ImageUploadZone
                  currentUrl={brand?.logo_url || ""}
                  onUpload={(file) => handleUpload("logo", file)}
                  isUploading={uploadImage.isPending && uploadImage.variables?.field === "logo"}
                  aspectRatio="video"
                  description="Recomendado: 200x50px (SVG ou PNG transparente)"
                />
              </div>
              <div className="space-y-3 opacity-50 cursor-not-allowed">
                <label className="text-sm font-medium">Logo Principal (Modo Escuro)</label>
                <div className="relative rounded-lg border border-dashed border-border bg-surface-raised p-4 flex items-center justify-center text-xs text-muted-foreground">
                  Funcionalidade em desenvolvimento
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Ícones e Mobile */}
        <SettingsSection
          title="Favicon & Web App"
          description="Ícones exibidos na aba do navegador e ao instalar o app no celular."
          icon={Smartphone}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Favicon</label>
              <ImageUploadZone
                currentUrl={brand?.favicon_url || ""}
                onUpload={(file) => handleUpload("favicon", file)}
                isUploading={uploadImage.isPending && uploadImage.variables?.field === "favicon"}
                aspectRatio="square"
                description="32x32px"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Ícone PWA (192x192)</label>
              <ImageUploadZone
                currentUrl={brand?.icon_192_url || ""}
                onUpload={(file) => handleUpload("icon_192", file)}
                isUploading={uploadImage.isPending && uploadImage.variables?.field === "icon_192"}
                aspectRatio="square"
                description="192x192px (PNG)"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Ícone PWA (512x512)</label>
              <ImageUploadZone
                currentUrl={brand?.icon_512_url || ""}
                onUpload={(file) => handleUpload("icon_512", file)}
                isUploading={uploadImage.isPending && uploadImage.variables?.field === "icon_512"}
                aspectRatio="square"
                description="512x512px (PNG)"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Cores */}
        <SettingsSection
          title="Paleta de Cores"
          description="Defina as cores principais que serão aplicadas em todo o sistema."
          icon={Palette}
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Principal (Accent)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorAccent}
                    onChange={(e) => setColorAccent(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-surface shadow-sm"
                  />
                  <Input 
                    value={colorAccent} 
                    onChange={(e) => setColorAccent(e.target.value)}
                    className="h-9 font-mono text-xs uppercase bg-surface"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Fundo / Textos (Navy)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorNavy}
                    onChange={(e) => setColorNavy(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-surface shadow-sm"
                  />
                  <Input 
                    value={colorNavy} 
                    onChange={(e) => setColorNavy(e.target.value)}
                    className="h-9 font-mono text-xs uppercase bg-surface"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Sucesso (Green)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorGreen}
                    onChange={(e) => setColorGreen(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-surface shadow-sm"
                  />
                  <Input 
                    value={colorGreen} 
                    onChange={(e) => setColorGreen(e.target.value)}
                    className="h-9 font-mono text-xs uppercase bg-surface"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-surface-raised p-6 border border-border shadow-inner">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: colorAccent }} />
                Preview em Tempo Real
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <div className="px-4 py-2 rounded-lg text-white text-sm font-bold shadow-sm" style={{ backgroundColor: colorAccent }}>
                  Botão Primário
                </div>
                <div className="px-4 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: colorAccent, color: colorAccent }}>
                  Outline Action
                </div>
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: colorNavy }}>
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: colorGreen }}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorGreen }} />
                  Status Online
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
