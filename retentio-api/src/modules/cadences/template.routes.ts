import { Router } from 'express';
import { z } from 'zod';
import Handlebars from 'handlebars';
import { StepChannel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard } from '../../middlewares';
import { AppError } from '../../shared/types';

export const templateRouter = Router();
templateRouter.use(authGuard);

// ─── Schemas ─────────────────────────────────────────────────────────

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().max(255).optional(),
  body: z.string().min(1),
  channel: z.nativeEnum(StepChannel).default('EMAIL'),
  variables: z.array(z.string()).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial().omit({ channel: true });

const previewSchema = z.object({
  template_id: z.string().uuid(),
  context: z.record(z.string(), z.unknown()).default({}),
});

// ─── Helpers ─────────────────────────────────────────────────────────

function extractVariables(body: string, subject?: string): string[] {
  const pattern = /\{\{([^}]+)\}\}/g;
  const vars = new Set<string>();
  const text = `${body} ${subject ?? ''}`;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1]!.trim().replace(/^[#/^]/, '');
    if (name) vars.add(name);
  }
  return [...vars];
}

// ─── Routes ──────────────────────────────────────────────────────────

// GET /templates
templateRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { channel, active } = req.query as { channel?: string; active?: string };
    const templates = await prisma.template.findMany({
      where: {
        ...(channel && { channel: channel as StepChannel }),
        active: active === 'false' ? false : true,
      },
      orderBy: [{ channel: 'asc' }, { name: 'asc' }],
    });
    res.json(templates);
  }),
);

// GET /templates/:id
templateRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id as string },
      include: { cadence_steps: { select: { id: true, cadence: { select: { id: true, name: true } } } } },
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
    const { body, subject, variables, ...rest } = req.body;

    // Valida sintaxe Handlebars
    try {
      Handlebars.precompile(body);
      if (subject) Handlebars.precompile(subject);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(400, `Template inválido: ${msg}`, 'TEMPLATE_SYNTAX_ERROR');
    }

    const extractedVars = variables ?? extractVariables(body, subject);

    const template = await prisma.template.create({
      data: { ...rest, body, subject, variables: extractedVars },
    });

    res.status(201).json(template);
  }),
);

// PATCH /templates/:id
// Incrementa versão automaticamente
templateRouter.patch(
  '/:id',
  validate(updateTemplateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.template.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing) throw new AppError(404, 'Template não encontrado');

    const { body, subject } = req.body;
    const newBody = body ?? existing.body;
    const newSubject = subject ?? existing.subject ?? undefined;

    // Valida sintaxe se mudou corpo/assunto
    if (body || subject) {
      try {
        Handlebars.precompile(newBody);
        if (newSubject) Handlebars.precompile(newSubject);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new AppError(400, `Template inválido: ${msg}`, 'TEMPLATE_SYNTAX_ERROR');
      }
    }

    const extractedVars = req.body.variables ?? ((body || subject) ? extractVariables(newBody, newSubject) : undefined);

    const template = await prisma.template.update({
      where: { id: req.params.id as string },
      data: {
        ...req.body,
        ...(body || subject ? { version: existing.version + 1 } : {}),
        ...(extractedVars ? { variables: extractedVars } : {}),
      },
    });

    res.json(template);
  }),
);

// DELETE /templates/:id (soft delete)
templateRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id as string },
      include: { cadence_steps: { select: { id: true } } },
    });
    if (!template) throw new AppError(404, 'Template não encontrado');

    if (template.cadence_steps.length > 0) {
      throw new AppError(409, 'Template está em uso por cadências', 'TEMPLATE_IN_USE');
    }

    await prisma.template.update({
      where: { id: req.params.id as string },
      data: { active: false },
    });

    res.status(204).send();
  }),
);

// POST /templates/preview — renderiza Handlebars com contexto de teste
templateRouter.post(
  '/preview',
  validate(previewSchema),
  asyncHandler(async (req, res) => {
    const { template_id, context } = req.body;
    const template = await prisma.template.findUnique({ where: { id: template_id } });
    if (!template) throw new AppError(404, 'Template não encontrado');

    try {
      const bodyFn = Handlebars.compile(template.body);
      const subjectFn = template.subject ? Handlebars.compile(template.subject) : null;

      res.json({
        subject: subjectFn ? subjectFn(context) : null,
        body: bodyFn(context),
        variables_used: Object.keys(context),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(400, `Erro ao renderizar template: ${msg}`, 'RENDER_ERROR');
    }
  }),
);
