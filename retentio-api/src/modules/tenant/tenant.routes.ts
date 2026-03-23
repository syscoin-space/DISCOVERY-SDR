import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, roleGuard, getTenantId, validate } from '../../middlewares';
import { Role } from '@prisma/client';
import { AppError } from '../../shared/types';

export const tenantRouter = Router();

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  discovery_enabled: z.boolean().optional(),
});

/**
 * GET /api/tenant
 * Retorna as configurações do tenant atual
 */
tenantRouter.get(
  '/',
  authGuard,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        discovery_enabled: true,
        onboarding_status: true,
        onboarding_step: true,
        active: true,
        created_at: true,
        updated_at: true,
        branding: true,
      }
    });

    if (!tenant) throw new AppError(404, 'Tenant não encontrado');

    res.json(tenant);
  })
);

/**
 * PATCH /api/tenant
 * Atualiza configurações do tenant (Apenas OWNER)
 */
tenantRouter.patch(
  '/',
  authGuard,
  roleGuard(Role.OWNER),
  validate(updateTenantSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { name, discovery_enabled } = req.body;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: name ?? undefined,
        discovery_enabled: discovery_enabled ?? undefined,
      },
    });

    res.json({
      success: true,
      tenant: {
        id: updated.id,
        name: updated.name,
        discovery_enabled: updated.discovery_enabled,
      }
    });
  })
);
