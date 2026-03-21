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
      select: { branding: true, name: true }
    });

    res.json(tenant?.branding || {
      primaryColor: '#000000',
      logoUrl: null,
      companyName: 'Retentio'
    });
  })
);
