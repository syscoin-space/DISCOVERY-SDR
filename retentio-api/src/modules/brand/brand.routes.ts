import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../middlewares';

export const brandRouter = Router();

// GET /api/brand
// Pega as configurações de branding (Público ou Contextual)
brandRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    // Tenta pegar o primeiro tenant ativo para branding padrão do SaaS
    const tenant = await prisma.tenant.findFirst({
      where: { active: true },
      select: { id: true, branding: true, name: true }
    });

    // Remapeamento para coincidir com a interface BrandConfig do Frontend
    const branding = (tenant?.branding as any) || {};

    res.json({
      id: tenant?.id || 'default',
      app_name: branding.app_name || tenant?.name || 'Retentio',
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      icon_192_url: branding.icon_192_url || null,
      icon_512_url: branding.icon_512_url || null,
      color_accent: branding.color_accent || branding.primaryColor || '#4F46E5', // Indigo default
      color_navy: branding.color_navy || '#0F172A',
      color_green: branding.color_green || '#10B981',
      updated_at: new Date().toISOString()
    });
  })
);
