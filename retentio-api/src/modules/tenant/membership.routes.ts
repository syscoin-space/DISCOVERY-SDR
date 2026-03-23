import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, roleGuard, getTenantId, validate } from '../../middlewares';
import { Role } from '@prisma/client';
import { AppError } from '../../shared/types';

export const membershipRouter = Router();

const updateMembershipSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/memberships
 * Lista todos os membros do tenant
 */
membershipRouter.get(
  '/',
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const memberships = await prisma.membership.findMany({
      where: { tenant_id: tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    res.json(memberships);
  })
);

/**
 * PATCH /api/memberships/:id
 * Atualiza o papel ou status de um membro
 */
membershipRouter.patch(
  '/:id',
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  validate(updateMembershipSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = req.params.id as string;

    const existing = await prisma.membership.findFirst({
      where: { id: membershipId, tenant_id: tenantId }
    });

    if (!existing) throw new AppError(404, 'Membro não encontrado');

    // OWNER não pode ser alterado por MANAGER
    if (existing.role === Role.OWNER && (req as any).user.role !== Role.OWNER) {
      throw new AppError(403, 'Apenas o OWNER pode alterar outro OWNER');
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: req.body,
      include: { user: { select: { name: true, email: true } } }
    });

    res.json(updated);
  })
);

/**
 * DELETE /api/memberships/:id
 * Remove um membro do tenant
 */
membershipRouter.delete(
  '/:id',
  authGuard,
  roleGuard(Role.OWNER),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = req.params.id as string;

    const existing = await prisma.membership.findFirst({
      where: { id: membershipId, tenant_id: tenantId }
    });

    if (!existing) throw new AppError(404, 'Membro não encontrado');
    if (existing.role === Role.OWNER) throw new AppError(400, 'Não é possível remover o OWNER do tenant');

    await prisma.membership.delete({
      where: { id: membershipId }
    });

    res.status(204).send();
  })
);
