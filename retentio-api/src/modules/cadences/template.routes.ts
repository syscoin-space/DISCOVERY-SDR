import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard, getTenantId } from '../../middlewares';
import { AppError } from '../../shared/types';

export const templateRouter = Router();

templateRouter.use(authGuard);

const createTemplateSchema = z.object({
  name: z.string().min(2),
  subject: z.string().optional(),
  body: z.string().min(2),
  channel: z.string(),
  purpose: z.enum(['PRIMEIRO_CONTATO', 'FOLLOW_UP', 'NUTRICAO', 'CONFIRMACAO_REUNIAO', 'REATIVACAO']).default('PRIMEIRO_CONTATO'),
});

// GET /templates
templateRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const templates = await prisma.template.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
    res.json(templates);
  }),
);

// GET /templates/:id
templateRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const template = await prisma.template.findFirst({
      where: { id: req.params.id as string, tenant_id: tenantId },
    });
    if (!template) throw new AppError(404, 'Template não encontrado');
    res.json(template);
  }),
);

// POST /templates
templateRouter.post(
  '/',
  validate(createTemplateSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const template = await prisma.template.create({
      data: {
        ...req.body,
        tenant_id: tenantId,
      },
    });
    res.status(201).json(template);
  }),
);

// PATCH /templates/:id
templateRouter.patch(
  '/:id',
  validate(createTemplateSchema.partial()),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const template = await prisma.template.findFirst({
      where: { id: req.params.id as string, tenant_id: tenantId },
    });
    if (!template) throw new AppError(404, 'Template não encontrado');

    const updated = await prisma.template.update({
      where: { id: template.id },
      data: req.body,
    });
    res.json(updated);
  }),
);

// DELETE /templates/:id
templateRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const template = await prisma.template.findFirst({
      where: { id: req.params.id as string, tenant_id: tenantId },
    });
    if (!template) throw new AppError(404, 'Template não encontrado');

    await prisma.template.delete({ where: { id: template.id } });
    res.status(204).send();
  }),
);
