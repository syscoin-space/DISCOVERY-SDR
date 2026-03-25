import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, roleGuard, getTenantId } from '../../middlewares';
import { Role } from '@prisma/client';
import { AppError } from '../../shared/types';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export const brandRouter = Router();

/**
 * GET /api/brand
 * Pega as configurações de branding (Contextual por Tenant ID ou Slug)
 */
brandRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    let { tenant_id, slug } = req.query;

    if (!tenant_id && !slug) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, env.JWT_SECRET) as any;
          // Standardized to snake_case from JWT
          tenant_id = decoded.tenant_id || decoded.tenantId;
        } catch (e) {
          console.error('[BrandResolution] JWT Error:', e);
        }
      }
    }

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
    }

    const branding = (tenant?.branding as any) || {};
    
    // Fetch global branding for fallback
    const globalConfig = await prisma.systemConfig.findUnique({
      where: { id: 'GLOBAL' }
    });
    const globalBranding = (globalConfig?.branding as any) || {};

    const PRODUCT_BRANDING = {
      app_name: 'Discovery SDR',
      color_accent: '#2E86AB',
      color_navy: '#1E3A5F',
      color_green: '#1A7A5E',
    };

    // Consistent return structure
    res.json({
      id: tenant?.id || 'GLOBAL',
      app_name: branding.app_name || tenant?.name || globalBranding.app_name || PRODUCT_BRANDING.app_name,
      logo_url: branding.logo_url || globalBranding.logo_url || null,
      favicon_url: branding.favicon_url || globalBranding.favicon_url || null,
      icon_192_url: branding.icon_192_url || globalBranding.icon_192_url || null,
      icon_512_url: branding.icon_512_url || globalBranding.icon_512_url || null,
      color_accent: branding.color_accent || branding.primaryColor || globalBranding.color_accent || PRODUCT_BRANDING.color_accent,
      color_navy: branding.color_navy || globalBranding.color_navy || PRODUCT_BRANDING.color_navy,
      color_green: branding.color_green || globalBranding.color_green || PRODUCT_BRANDING.color_green,
      updated_at: new Date().toISOString()
    });
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

brandRouter.patch(
  '/',
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { app_name, color_accent, color_navy, color_green } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError(404, 'Tenant não encontrado');

    const currentBranding = (tenant.branding as any) || {};
    const newBranding = {
      ...currentBranding,
      app_name: app_name ?? currentBranding.app_name,
      color_accent: color_accent ?? currentBranding.color_accent,
      color_navy: color_navy ?? currentBranding.color_navy,
      color_green: color_green ?? currentBranding.color_green,
    };

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { branding: newBranding }
    });

    // Mirroring GET logic for immediate consistent response
    const branding = (updated.branding as any) || {};
    res.json({
      id: updated.id,
      app_name: branding.app_name || updated.name,
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      icon_192_url: branding.icon_192_url || null,
      icon_512_url: branding.icon_512_url || null,
      color_accent: branding.color_accent || '#2E86AB',
      color_navy: branding.color_navy || '#1E3A5F',
      color_green: branding.color_green || '#1A7A5E',
      updated_at: new Date().toISOString()
    });
  })
);

brandRouter.post(
  '/upload/:field',
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const field = req.params.field as string;
    if (!req.file) throw new AppError(400, 'Arquivo ausente');

    const validFields = ['logo', 'favicon', 'icon_192', 'icon_512'];
    if (!validFields.includes(field)) throw new AppError(400, 'Campo inválido');

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const currentBranding = (tenant?.branding as any) || {};
    
    const newBranding = {
      ...currentBranding,
      [`${field}_url`]: dataUri
    };

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { branding: newBranding }
    });

    const branding = (updated.branding as any) || {};
    
    res.json({
      id: updated.id,
      app_name: branding.app_name || updated.name,
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      icon_192_url: branding.icon_192_url || null,
      icon_512_url: branding.icon_512_url || null,
      color_accent: branding.color_accent || '#2E86AB',
      color_navy: branding.color_navy || '#1E3A5F',
      color_green: branding.color_green || '#1A7A5E',
      updated_at: new Date().toISOString()
    });
  })
);

/**
 * POST /api/brand/reset
 * Restaura branding padrão
 */
brandRouter.post(
  '/reset',
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { branding: {} },
      select: { id: true, branding: true, name: true }
    });

    res.json({
      id: updated.id,
      app_name: updated.name,
      logo_url: null,
      favicon_url: null,
      color_accent: '#2E86AB',
      color_navy: '#1E3A5F',
      color_green: '#1A7A5E',
      updated_at: new Date().toISOString()
    });
  })
);
