import { Router } from 'express';
import { z } from 'zod';
import { InteractionType, InteractionSource } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard } from '../../middlewares';
import { AppError } from '../../shared/types';

export const interactionRouter = Router({ mergeParams: true });
interactionRouter.use(authGuard);

// ─── Schemas ─────────────────────────────────────────────────────────

const createInteractionSchema = z.object({
  type: z.nativeEnum(InteractionType),
  source: z.nativeEnum(InteractionSource).default('MANUAL'),
  channel: z.string().optional(),
  subject: z.string().max(255).optional(),
  body: z.string().optional(),
  status: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  external_id: z.string().optional(),
});

const listQuerySchema = z.object({
  type: z.nativeEnum(InteractionType).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

import { getTenantId, getMembershipId } from '../../middlewares';

// ─── Helpers ─────────────────────────────────────────────────────────

async function assertLeadAccess(req: any, leadId: string) {
  const tenantId = getTenantId(req);
  const membershipId = getMembershipId(req);
  const role = req.user?.role;

  const where: any = { id: leadId, tenant_id: tenantId };

  if (role === 'SDR') {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    const settings = tenant?.settings as any;
    // Se sdrVisibility !== 'ALL', o SDR só acessa o que é DELE ou o que está no BANCO (esperando)
    if (settings?.sdrVisibility !== 'ALL') {
      where.OR = [
        { sdr_id: membershipId },
        { status: 'BANCO' },
        { sdr_id: null }
      ];
    }
  }

  const lead = await prisma.lead.findFirst({
    where,
    select: { id: true },
  });
  
  if (!lead) throw new AppError(404, 'Lead não encontrado ou acesso restrito');
}

// ─── Routes ──────────────────────────────────────────────────────────

// GET /leads/:leadId/interactions
// Retorna timeline em ordem decrescente (mais recente primeiro) com cursor pagination
interactionRouter.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { leadId } = req.params as { leadId: string };
    await assertLeadAccess(req, leadId);

    const { type, cursor, limit } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where = {
      lead_id: leadId,
      ...(type && { type }),
      ...(cursor && {
        created_at: {
          lt: (await prisma.interaction.findUnique({
            where: { id: cursor },
            select: { created_at: true },
          }))?.created_at,
        },
      }),
    };

    const items = await prisma.interaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit + 1,
    });

    const hasNext = items.length > limit;
    if (hasNext) items.pop();

    res.json({
      items,
      next_cursor: hasNext ? items[items.length - 1]?.id : null,
      count: items.length,
    });
  }),
);

// POST /leads/:leadId/interactions
interactionRouter.post(
  '/',
  validate(createInteractionSchema),
  asyncHandler(async (req, res) => {
    const { leadId } = req.params as { leadId: string };
    await assertLeadAccess(req, leadId);

    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    const interaction = await prisma.interaction.create({
      data: { 
        ...req.body, 
        lead_id: leadId,
        tenant_id: tenantId,
        membership_id: membershipId,
        source: req.body.source || 'MANUAL'
      },
    });

    res.status(201).json(interaction);
  }),
);

// GET /leads/:leadId/interactions/:id
interactionRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { leadId, id } = req.params as { leadId: string; id: string };
    await assertLeadAccess(req, leadId);

    const interaction = await prisma.interaction.findFirst({
      where: { id, lead_id: leadId },
    });
    if (!interaction) throw new AppError(404, 'Interação não encontrada');

    res.json(interaction);
  }),
);

// DELETE /leads/:leadId/interactions/:id
interactionRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { leadId, id } = req.params as { leadId: string; id: string };
    await assertLeadAccess(req, leadId);

    const interaction = await prisma.interaction.findFirst({
      where: { id, lead_id: leadId, source: 'MANUAL' },
    });
    if (!interaction) throw new AppError(404, 'Interação não encontrada ou não é manual');

    await prisma.interaction.delete({ where: { id } });
    res.status(204).send();
  }),
);

// GET /leads/:leadId/interactions/summary
// Retorna contagens por tipo
interactionRouter.get(
  '/summary/counts',
  asyncHandler(async (req, res) => {
    const { leadId } = req.params as { leadId: string };
    await assertLeadAccess(req, leadId);

    const counts = await prisma.interaction.groupBy({
      by: ['type'],
      where: { lead_id: leadId },
      _count: { _all: true },
    });

    const summary = counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = row._count._all;
      return acc;
    }, {});

    res.json({ lead_id: leadId, summary, total: Object.values(summary).reduce((a, b) => a + b, 0) });
  }),
);
