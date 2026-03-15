import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, authGuard, roleGuard } from '../../middlewares';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/types';

export const brandRouter = Router();

const DEFAULTS = {
  app_name: 'Retentio',
  color_accent: '#2E86AB',
  color_navy: '#1E3A5F',
  color_green: '#1A7A5E',
};

// Multer for image uploads (max 2MB, images only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Apenas imagens são aceitas', 'INVALID_FILE_TYPE'));
    }
  },
});

async function getOrCreateBrand() {
  let brand = await prisma.brandConfig.findFirst();
  if (!brand) {
    brand = await prisma.brandConfig.create({ data: {} });
  }
  return brand;
}

// GET /api/brand — public, returns brand config
brandRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const brand = await getOrCreateBrand();
    res.json(brand);
  }),
);

// GET /api/brand/manifest.json — dynamic PWA manifest
brandRouter.get(
  '/manifest.json',
  asyncHandler(async (_req, res) => {
    const brand = await getOrCreateBrand();
    const manifest = {
      name: brand.app_name,
      short_name: brand.app_name,
      description: `CRM de prospecção — ${brand.app_name}`,
      start_url: '/hoje',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0A0F1E',
      theme_color: brand.color_accent,
      icons: [
        {
          src: brand.icon_192_url || '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: brand.icon_512_url || '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: brand.icon_512_url || '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };
    res.setHeader('Content-Type', 'application/manifest+json');
    res.json(manifest);
  }),
);

// PATCH /api/brand — update brand config (GESTOR only)
brandRouter.patch(
  '/',
  authGuard,
  roleGuard('GESTOR'),
  asyncHandler(async (req, res) => {
    const brand = await getOrCreateBrand();
    const { app_name, color_accent, color_navy, color_green } = req.body;

    const data: Record<string, string> = {};
    if (app_name !== undefined) data.app_name = app_name;
    if (color_accent !== undefined) data.color_accent = color_accent;
    if (color_navy !== undefined) data.color_navy = color_navy;
    if (color_green !== undefined) data.color_green = color_green;

    const updated = await prisma.brandConfig.update({
      where: { id: brand.id },
      data,
    });
    res.json(updated);
  }),
);

// POST /api/brand/upload/:field — upload image (GESTOR only)
// field: logo | favicon | icon_192 | icon_512
brandRouter.post(
  '/upload/:field',
  authGuard,
  roleGuard('GESTOR'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const field = req.params.field as string;
    const validFields = ['logo', 'favicon', 'icon_192', 'icon_512'];
    if (!validFields.includes(field)) {
      throw new AppError(400, `Campo inválido: ${field}. Use: ${validFields.join(', ')}`, 'INVALID_FIELD');
    }

    if (!req.file) {
      throw new AppError(400, 'Arquivo ausente (field: "file")', 'FILE_MISSING');
    }

    const brand = await getOrCreateBrand();
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const dbField = `${field}_url` as 'logo_url' | 'favicon_url' | 'icon_192_url' | 'icon_512_url';
    const updated = await prisma.brandConfig.update({
      where: { id: brand.id },
      data: { [dbField]: dataUri },
    });
    res.json(updated);
  }),
);

// POST /api/brand/reset — reset to defaults (GESTOR only)
brandRouter.post(
  '/reset',
  authGuard,
  roleGuard('GESTOR'),
  asyncHandler(async (req, res) => {
    const brand = await getOrCreateBrand();
    const updated = await prisma.brandConfig.update({
      where: { id: brand.id },
      data: {
        ...DEFAULTS,
        logo_url: null,
        favicon_url: null,
        icon_192_url: null,
        icon_512_url: null,
      },
    });
    res.json(updated);
  }),
);
