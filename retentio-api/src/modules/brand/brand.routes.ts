import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler, getTenantId, authGuard } from '../../middlewares';

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
      logo_url: null,
      primary_color: '#0ea5e9',
      secondary_color: '#6366f1',
      company_name: tenant?.name || 'Retentio'
    });
  })
);

// Fallback para rota pública (ex: tela de login antes do tenant ser conhecido)
// Tenta pegar pelo domínio ou slug se fornecido, ou retorna padrão
brandRouter.get(
  '/public',
  asyncHandler(async (req, res) => {
    const { slug } = req.query;
    if (slug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: slug as string },
        select: { branding: true }
      });
      if (tenant?.branding) return res.json(tenant.branding);
    }

    res.json({
      logo_url: null,
      primary_color: '#0ea5e9',
      secondary_color: '#6366f1',
      company_name: 'Retentio'
    });
  })
);
