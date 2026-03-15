import { Router } from 'express';
import { z } from 'zod';
import { StepChannel, CadenceType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard } from '../../middlewares';
import { AppError } from '../../shared/types';

export const cadenceRouter = Router();
cadenceRouter.use(authGuard);

const stepSchema = z.object({
  step_order: z.number().int().positive(),
  day_offset: z.number().int().nonnegative(),
  channel: z.nativeEnum(StepChannel),
  template_id: z.string().uuid().optional(),
  instructions: z.string().optional(),
});

const createCadenceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(CadenceType).default('STANDARD'),
  description: z.string().optional(),
  steps: z.array(stepSchema).min(1),
});

const enrollLeadSchema = z.object({
  lead_id: z.string().uuid(),
});

// GET /cadences
cadenceRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const cadences = await prisma.cadence.findMany({
      where: { active: true },
      include: { steps: { orderBy: { step_order: 'asc' } }, _count: { select: { lead_cadences: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(cadences);
  }),
);

// POST /cadences
cadenceRouter.post(
  '/',
  validate(createCadenceSchema),
  asyncHandler(async (req, res) => {
    const { steps, ...cadenceData } = req.body;
    const cadence = await prisma.cadence.create({
      data: {
        ...cadenceData,
        steps: { create: steps },
      },
      include: { steps: true },
    });
    res.status(201).json(cadence);
  }),
);

// GET /cadences/:id
cadenceRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cadence = await prisma.cadence.findUnique({
      where: { id: req.params.id as string },
      include: {
        steps: { orderBy: { step_order: 'asc' }, include: { template: true } },
        lead_cadences: { include: { lead: { select: { id: true, company_name: true, status: true } } } },
      },
    });
    if (!cadence) throw new AppError(404, 'Cadência não encontrada');
    res.json(cadence);
  }),
);

// PATCH /cadences/:id
const updateCadenceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(CadenceType).optional(),
  description: z.string().nullable().optional(),
  steps: z.array(stepSchema).min(1).optional(),
});

cadenceRouter.patch(
  '/:id',
  validate(updateCadenceSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const existing = await prisma.cadence.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Cadência não encontrada');

    const { steps, ...cadenceData } = req.body;

    const cadence = await prisma.$transaction(async (tx) => {
      // Update cadence fields
      await tx.cadence.update({
        where: { id },
        data: cadenceData,
      });

      // If steps provided, delete old ones and recreate
      if (steps) {
        await tx.cadenceStep.deleteMany({ where: { cadence_id: id } });
        await tx.cadenceStep.createMany({
          data: steps.map((s: z.infer<typeof stepSchema>) => ({
            cadence_id: id,
            ...s,
          })),
        });
      }

      return tx.cadence.findUnique({
        where: { id },
        include: { steps: { orderBy: { step_order: 'asc' } } },
      });
    });

    res.json(cadence);
  }),
);

// DELETE /cadences/:id (soft delete — sets active = false)
cadenceRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const existing = await prisma.cadence.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Cadência não encontrada');

    await prisma.cadence.update({
      where: { id },
      data: { active: false },
    });

    res.status(204).send();
  }),
);

// POST /cadences/:id/enroll
cadenceRouter.post(
  '/:id/enroll',
  validate(enrollLeadSchema),
  asyncHandler(async (req, res) => {
    const cadence = await prisma.cadence.findUnique({
      where: { id: req.params.id as string },
      include: { steps: { orderBy: { step_order: 'asc' } } },
    });
    if (!cadence) throw new AppError(404, 'Cadência não encontrada');

    const lead = await prisma.lead.findFirst({
      where: { id: req.body.lead_id, sdr_id: req.user!.sub },
    });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    // Check if already enrolled
    const existing = await prisma.leadCadence.findUnique({
      where: { lead_id_cadence_id: { lead_id: lead.id, cadence_id: cadence.id } },
    });
    if (existing && existing.status === 'active') {
      throw new AppError(409, 'Lead já inscrito nesta cadência', 'ALREADY_ENROLLED');
    }

    const now = new Date();
    const leadCadence = await prisma.leadCadence.create({
      data: {
        lead_id: lead.id,
        cadence_id: cadence.id,
        steps: {
          create: cadence.steps.map((step: { id: string; day_offset: number }) => ({
            cadence_step_id: step.id,
            scheduled_at: new Date(now.getTime() + step.day_offset * 24 * 60 * 60 * 1000),
          })),
        },
      },
      include: { steps: { include: { cadence_step: true } } },
    });

    res.status(201).json(leadCadence);
  }),
);

// DELETE /cadences/:cadenceId/enroll/:leadId
cadenceRouter.delete(
  '/:cadenceId/enroll/:leadId',
  asyncHandler(async (req, res) => {
    const lc = await prisma.leadCadence.findUnique({
      where: { lead_id_cadence_id: { lead_id: req.params.leadId as string, cadence_id: req.params.cadenceId as string } },
    });
    if (!lc) throw new AppError(404, 'Inscrição não encontrada');

    await prisma.leadCadence.update({
      where: { id: lc.id },
      data: { status: 'cancelled', completed_at: new Date() },
    });

    // Cancel pending steps
    await prisma.leadCadenceStep.updateMany({
      where: { lead_cadence_id: lc.id, status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    });

    res.status(204).send();
  }),
);
