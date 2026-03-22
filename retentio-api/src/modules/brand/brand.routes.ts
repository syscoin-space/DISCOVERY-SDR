import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../middlewares';

export const brandRouter = Router();

// GET /api/brand
// Pega as configurações de branding (Contextual por Tenant ID ou Slug)
brandRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { tenant_id, slug } = req.query;

    let tenant;

    if (tenant_id) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenant_id as string },
        select: { id: true, branding: true, name: true }
      });
    } else if (slug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: slug as string },
        select: { id: true, branding: true, name: true }
      });
    } else {
      // Fallback para o primeiro tenant ativo (Branding Padrão do Saas)
      tenant = await prisma.tenant.findFirst({
        where: { active: true },
        select: { id: true, branding: true, name: true }
      });
    }

    // Remapeamento para coincidir com a interface BrandConfig do Frontend
    const branding = (tenant?.branding as any) || {};

    res.json({
      id: tenant?.id || 'default',
      app_name: branding.app_name || tenant?.name || 'Retentio',
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      color_accent: branding.color_accent || branding.primaryColor || '#4F46E5', // Indigo default
      color_navy: branding.color_navy || '#0F172A',
      color_green: branding.color_green || '#10B981',
      updated_at: new Date().toISOString()
    });
  })
);
