import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard, roleGuard } from '../../middlewares';
import { AppError } from '../../shared/types';

export const handoffRouter = Router();
handoffRouter.use(authGuard);

const createHandoffSchema = z.object({
  lead_id: z.string().uuid(),
  closer_id: z.string().uuid().optional(),
});

const returnHandoffSchema = z.object({
  reason: z.string().min(10).max(500),
  reentry_status: z.enum(['EM_PROSPECCAO', 'NUTRICAO', 'SEM_PERFIL']),
});

// POST /handoffs — SDR cria handoff
handoffRouter.post(
  '/',
  validate(createHandoffSchema),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({
      where: { id: req.body.lead_id, sdr_id: req.user!.sub, status: 'OPORTUNIDADE_QUALIFICADA' },
      include: { prr_inputs: true, icp_answers: { include: { criteria: true } }, interactions: { take: 5, orderBy: { created_at: 'desc' } } },
    });
    if (!lead) throw new AppError(404, 'Lead não encontrado ou não qualificado');

    // Auto-gera briefing
    const briefingData = {
      company: lead.company_name,
      niche: lead.niche,
      contact: { name: lead.contact_name, role: lead.contact_role, email: lead.email },
      prr: { score: lead.prr_score, tier: lead.prr_tier },
      icp: { score: lead.icp_score, tier: lead.icp_tier },
      momento_compra: lead.momento_compra,
      last_interactions: lead.interactions.map((i: { type: string; created_at: Date; subject: string | null }) => ({
        type: i.type,
        date: i.created_at,
        subject: i.subject,
      })),
    };

    const handoff = await prisma.handoffBriefing.create({
      data: {
        lead_id: lead.id,
        sdr_id: req.user!.sub,
        closer_id: req.body.closer_id,
        briefing_data: briefingData as any,
      },
    });

    res.status(201).json(handoff);
  }),
);

// GET /handoffs
handoffRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = req.user!.role === 'CLOSER'
      ? { closer_id: req.user!.sub }
      : req.user!.role === 'SDR'
      ? { sdr_id: req.user!.sub }
      : {};

    const handoffs = await prisma.handoffBriefing.findMany({
      where,
      include: {
        lead: { select: { id: true, company_name: true, status: true, prr_tier: true } },
        sdr: { select: { id: true, name: true } },
        closer: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(handoffs);
  }),
);

// PATCH /handoffs/:id/accept
handoffRouter.patch(
  '/:id/accept',
  roleGuard('CLOSER'),
  asyncHandler(async (req, res) => {
    const handoff = await prisma.handoffBriefing.findUnique({ where: { id: req.params.id as string } });
    if (!handoff) throw new AppError(404, 'Handoff não encontrado');
    if (handoff.status !== 'PENDENTE') throw new AppError(422, 'Handoff já processado');

    const updated = await prisma.handoffBriefing.update({
      where: { id: req.params.id as string },
      data: { status: 'ACEITO', closer_id: req.user!.sub, accepted_at: new Date() },
    });
    res.json(updated);
  }),
);

// PATCH /handoffs/:id/return
handoffRouter.patch(
  '/:id/return',
  roleGuard('CLOSER'),
  validate(returnHandoffSchema),
  asyncHandler(async (req, res) => {
    const handoff = await prisma.handoffBriefing.findUnique({ where: { id: req.params.id as string } });
    if (!handoff) throw new AppError(404, 'Handoff não encontrado');
    if (handoff.status !== 'ACEITO') throw new AppError(422, 'Handoff não está aceito');

    const [updated] = await prisma.$transaction([
      prisma.handoffBriefing.update({
        where: { id: req.params.id as string },
        data: {
          status: 'DEVOLVIDO',
          returned_at: new Date(),
          return_reason: req.body.reason,
          return_reentry_status: req.body.reentry_status,
        },
      }),
      prisma.lead.update({
        where: { id: handoff.lead_id },
        data: { status: req.body.reentry_status },
      }),
    ]);

    res.json(updated);
  }),
);
