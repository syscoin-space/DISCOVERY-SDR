import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, roleGuard } from '../../middlewares';
import { Role } from '@prisma/client';
import { AppError } from '../../shared/types';

export const adminBrandRouter = Router();

/**
 * GET /api/admin/brand
 * Pega as configurações de branding GLOBAIS
 */
adminBrandRouter.get(
  '/',
  authGuard,
  roleGuard(Role.ADMIN),
  asyncHandler(async (req, res) => {
    let globalConfig = await prisma.systemConfig.findUnique({
      where: { id: 'GLOBAL' }
    });

    if (!globalConfig) {
      // Initialize if not exists
      globalConfig = await prisma.systemConfig.create({
        data: {
          id: 'GLOBAL',
          branding: {
            app_name: 'Discovery SDR',
            color_accent: '#2E86AB',
            color_navy: '#1E3A5F',
            color_green: '#1A7A5E',
          }
        }
      });
    }

    const branding = (globalConfig.branding as any) || {};

    res.json({
      id: 'GLOBAL',
      app_name: branding.app_name || 'Discovery SDR',
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      icon_192_url: branding.icon_192_url || null,
      icon_512_url: branding.icon_512_url || null,
      color_accent: branding.color_accent || '#2E86AB',
      color_navy: branding.color_navy || '#1E3A5F',
      color_green: branding.color_green || '#1A7A5E',
      updated_at: globalConfig.updated_at
    });
  })
);

/**
 * PATCH /api/admin/brand
 * Atualiza configurações de branding GLOBAIS
 */
adminBrandRouter.patch(
  '/',
  authGuard,
  roleGuard(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { app_name, color_accent, color_navy, color_green } = req.body;

    const globalConfig = await prisma.systemConfig.findUnique({ where: { id: 'GLOBAL' } });
    const currentBranding = (globalConfig?.branding as any) || {};

    const newBranding = {
      ...currentBranding,
      app_name: app_name ?? currentBranding.app_name,
      color_accent: color_accent ?? currentBranding.color_accent,
      color_navy: color_navy ?? currentBranding.color_navy,
      color_green: color_green ?? currentBranding.color_green,
    };

    const updated = await prisma.systemConfig.upsert({
      where: { id: 'GLOBAL' },
      create: { id: 'GLOBAL', branding: newBranding },
      update: { branding: newBranding }
    });

    const branding = (updated.branding as any) || {};
    res.json({
      id: 'GLOBAL',
      app_name: branding.app_name || 'Discovery SDR',
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      icon_192_url: branding.icon_192_url || null,
      icon_512_url: branding.icon_512_url || null,
      color_accent: branding.color_accent || '#2E86AB',
      color_navy: branding.color_navy || '#1E3A5F',
      color_green: branding.color_green || '#1A7A5E',
      updated_at: updated.updated_at
    });
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

/**
 * POST /api/admin/brand/upload/:field
 * Upload de imagens de marca GLOBAIS
 */
adminBrandRouter.post(
  '/upload/:field',
  authGuard,
  roleGuard(Role.ADMIN),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const field = req.params.field as string;
    if (!req.file) throw new AppError(400, 'Arquivo ausente');

    const validFields = ['logo', 'favicon', 'icon_192', 'icon_512'];
    if (!validFields.includes(field)) throw new AppError(400, 'Campo inválido');

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const globalConfig = await prisma.systemConfig.findUnique({ where: { id: 'GLOBAL' } });
    const currentBranding = (globalConfig?.branding as any) || {};
    
    const newBranding = {
      ...currentBranding,
      [`${field}_url`]: dataUri
    };

    const updated = await prisma.systemConfig.upsert({
      where: { id: 'GLOBAL' },
      create: { id: 'GLOBAL', branding: newBranding },
      update: { branding: newBranding }
    });

    const branding = (updated.branding as any) || {};

    res.json({
      id: 'GLOBAL',
      app_name: branding.app_name || 'Discovery SDR',
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      icon_192_url: branding.icon_192_url || null,
      icon_512_url: branding.icon_512_url || null,
      color_accent: branding.color_accent || '#2E86AB',
      color_navy: branding.color_navy || '#1E3A5F',
      color_green: branding.color_green || '#1A7A5E',
      updated_at: updated.updated_at
    });
  })
);
