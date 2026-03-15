import { Router } from 'express';
import multer from 'multer';
import Handlebars from 'handlebars';
import { asyncHandler, validate, authGuard } from '../../middlewares';
import { leadService } from './lead.service';
import { prisma } from '../../config/prisma';
import { LeadStatus, BloqueioStatus, InteractionSource, InteractionType } from '@prisma/client';
import { createLeadSchema, updateLeadSchema, updateLeadStatusSchema, leadFiltersSchema, blockDecisionSchema, createInteractionSchema } from './lead.schema';
import { importLeadsFromCsv } from './csv-import.service';
import { AppError } from '../../shared/types';
import { checkAndApplyBlocks } from './block.service';
import { enqueuePRRRecalculation } from '../../config/queues';
import { prrService } from '../prr/prr.service';
import { resendService, decryptApiKey } from '../cadences/resend.service';
import { z } from 'zod';

import { importFromBuffer } from './lead.import';

export const leadRouter = Router();
leadRouter.use(authGuard);

// Multer: armazena CSV/XLSX em memória (max 10 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // Algumas vezes CSV/XLSX vem assim dependendo do OS
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Apenas arquivos .csv e .xlsx são aceitos', 'INVALID_FILE_TYPE'));
    }
  },
});


// POST /leads/import — upload CSV/XLSX (multipart/form-data, campo "file")
leadRouter.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'Arquivo ausente (field: "file")', 'FILE_MISSING');
    
    const result = await importFromBuffer(req.file.buffer, req.file.mimetype, req.user!.sub, req.file.originalname);
    
    // Trigger PRR Recalculation para cada lead importado/atualizado
    if (result.leadIds && result.leadIds.length > 0) {
      // Enfilera em lotes ou individualmente (como prrQueue.add é rápido, vamos um por um com IDs únicos)
      for (const leadId of result.leadIds) {
        await enqueuePRRRecalculation(leadId);
      }
    }

    res.status(200).json({
      importados: result.importados,
      duplicatas: result.duplicatas,
      erros: result.erros,
      total: result.total
    });
  }),
);

// GET /leads
leadRouter.get(
  '/',
  validate(leadFiltersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await leadService.list(req.user!.sub, req.query as any, req.user!.role);
    res.json(result);
  }),
);

// GET /leads/:id/block-status
leadRouter.get(
  '/:id/block-status',
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id as string, sdr_id: req.user!.sub },
      select: {
        bloqueio_status: true,
        bloqueio_motivos: true,
        block_events: {
          orderBy: { detectado_at: 'desc' },
          take: 5,
        },
      },
    });
    if (!lead) throw new AppError(404, 'Lead não encontrado');
    res.json(lead);
  }),
);

// POST /leads/:id/block-decision
leadRouter.post(
  '/:id/block-decision',
  validate(blockDecisionSchema),
  asyncHandler(async (req, res) => {
    const { action, justificativa } = req.body;
    const leadId = req.params.id as string;
    const sdrId = req.user!.sub;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, sdr_id: sdrId } });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    if (action === 'confirm') {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.SEM_PERFIL,
          bloqueio_status: BloqueioStatus.CONFIRMADO,
        },
      });
    } else {
      // action === 'ignore'
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          bloqueio_status: BloqueioStatus.IGNORADO,
        },
      });

      await prisma.blockEvent.create({
        data: {
          lead_id: leadId,
          ignorado: true,
          ignorado_at: new Date(),
          ignorado_by: sdrId,
          justificativa,
        },
      });
    }

    res.json({ success: true });
  }),
);


// GET /leads/pipeline
leadRouter.get(
  '/pipeline',
  asyncHandler(async (req, res) => {
    const counts = await leadService.pipelineCounts(req.user!.sub);
    res.json(counts);
  }),
);

// GET /leads/:id
leadRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const lead = await leadService.getById(req.params.id as string, req.user!.sub, req.user!.role);
    res.json(lead);
  }),
);

// POST /leads
leadRouter.post(
  '/',
  validate(createLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadService.create(req.user!.sub, req.body);
    res.status(201).json(lead);
  }),
);

// PATCH /leads/:id
leadRouter.patch(
  '/:id',
  validate(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadService.update(req.params.id as string, req.user!.sub, req.body);
    res.json(lead);
  }),
);

// PATCH /leads/:id/status
leadRouter.patch(
  '/:id/status',
  validate(updateLeadStatusSchema),
  asyncHandler(async (req, res) => {
    const leadId = req.params.id as string;
    const lead = await leadService.updateStatus(leadId, req.user!.sub, req.body.status);
    
    // Trigger Block Check após mover status
    await checkAndApplyBlocks(leadId);
    
    res.json(lead);
  }),
);

// PATCH /leads/:id/prr-inputs
const prrInputsSchema = z.object({
  base_size_estimated: z.number().int().nonnegative().optional(),
  recompra_cycle_days: z.number().int().positive().optional(),
  avg_ticket_estimated: z.number().nonnegative().optional(),
  inactive_base_pct: z.number().min(0).max(100).optional(),
  integrability_score: z.number().int().min(0).max(20).optional(),
});

leadRouter.patch(
  '/:id/prr-inputs',
  validate(prrInputsSchema),
  asyncHandler(async (req, res) => {
    const leadId = req.params.id as string;
    await prrService.upsertInputs(leadId, req.body);
    
    // Trigger PRR Recalculation
    await enqueuePRRRecalculation(leadId);
    
    res.json({ success: true });
  }),
);

// GET /leads/:id/interactions
leadRouter.get(
  '/:id/interactions',
  asyncHandler(async (req, res) => {
    const interactions = await prisma.interaction.findMany({
      where: { lead_id: req.params.id as string },
      orderBy: { created_at: 'desc' },
    });
    res.json(interactions);
  }),
);

// POST /leads/:id/interactions
leadRouter.post(
  '/:id/interactions',
  validate(createInteractionSchema),
  asyncHandler(async (req, res) => {
    const leadId = req.params.id as string;
    const interaction = await prisma.interaction.create({
      data: {
        ...req.body,
        lead_id: leadId,
        source: InteractionSource.MANUAL,
      },
    });
    res.status(201).json(interaction);
  }),
);

// ─── Discovered Stack (Tech/Plataformas mapeadas pelo SDR) ────────

const stackSchema = z.object({
  category: z.string().min(1).max(100),
  tool_name: z.string().min(1).max(100),
});

// GET /leads/:id/stack
leadRouter.get(
  '/:id/stack',
  asyncHandler(async (req, res) => {
    const leadId = req.params.id as string;
    const lead = await prisma.lead.findFirst({ where: { id: leadId, sdr_id: req.user!.sub }, select: { id: true } });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    const stack = await prisma.discoveredStack.findMany({
      where: { lead_id: leadId },
      orderBy: [{ category: 'asc' }, { tool_name: 'asc' }],
    });
    res.json(stack);
  }),
);

// POST /leads/:id/stack
leadRouter.post(
  '/:id/stack',
  validate(stackSchema),
  asyncHandler(async (req, res) => {
    const leadId = req.params.id as string;
    const lead = await prisma.lead.findFirst({ where: { id: leadId, sdr_id: req.user!.sub }, select: { id: true } });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    const item = await prisma.discoveredStack.upsert({
      where: {
        lead_id_category_tool_name: {
          lead_id: leadId,
          category: req.body.category,
          tool_name: req.body.tool_name,
        },
      },
      create: {
        lead_id: leadId,
        category: req.body.category,
        tool_name: req.body.tool_name,
      },
      update: {},
    });
    res.status(201).json(item);
  }),
);

// DELETE /leads/:id/stack/:stackId
leadRouter.delete(
  '/:id/stack/:stackId',
  asyncHandler(async (req, res) => {
    const leadId = req.params.id as string;
    const lead = await prisma.lead.findFirst({ where: { id: leadId, sdr_id: req.user!.sub }, select: { id: true } });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    await prisma.discoveredStack.delete({ where: { id: req.params.stackId as string } });
    res.status(204).send();
  }),
);

// ─── Send Email via Resend ──────────────────────────────────────────

const sendEmailSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  template_id: z.string().uuid().optional(),
});

leadRouter.post(
  '/:id/send-email',
  validate(sendEmailSchema),
  asyncHandler(async (req, res) => {
    const sdrId = req.user!.sub;
    const leadId = req.params.id as string;

    // Verify lead exists
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, sdr_id: sdrId },
      select: { id: true, email: true, company_name: true, contact_name: true, niche: true },
    });
    if (!lead) throw new AppError(404, 'Lead não encontrado');
    if (!lead.email) throw new AppError(400, 'Lead não tem email cadastrado', 'NO_EMAIL');

    // Get SDR's resend config
    const config = await prisma.resendConfig.findUnique({ where: { user_id: sdrId } });
    if (!config) throw new AppError(400, 'Configure seu email em Configurações', 'NO_RESEND_CONFIG');
    if (!config.active) throw new AppError(400, 'Configuração de email desativada', 'CONFIG_INACTIVE');

    const { subject, body, template_id } = req.body;

    // Render Handlebars variables in subject/body
    const context = {
      empresa: lead.company_name,
      contato: lead.contact_name ?? '',
      nicho: lead.niche ?? '',
      email: lead.email,
    };
    let renderedSubject = subject;
    let renderedBody = body;
    try {
      renderedSubject = Handlebars.compile(subject)(context);
      renderedBody = Handlebars.compile(body)(context);
    } catch {
      // Use raw text if Handlebars fails
    }

    // Send via Resend
    const messageId = await resendService.sendEmail(config, {
      to: lead.email,
      subject: renderedSubject,
      html: renderedBody.replace(/\n/g, '<br>'),
      leadId,
    });

    // Increment sent_today counter
    await prisma.resendConfig.update({
      where: { id: config.id },
      data: { sent_today: { increment: 1 } },
    });

    // Create interaction record
    const interaction = await prisma.interaction.create({
      data: {
        lead_id: leadId,
        type: InteractionType.EMAIL,
        source: InteractionSource.MANUAL,
        external_id: messageId,
        subject: renderedSubject,
        body: renderedBody,
        status: 'SENT',
        metadata: template_id ? { template_id } : undefined,
      },
    });

    res.json({ success: true, message_id: messageId, interaction_id: interaction.id });
  }),
);

// DELETE /leads/:id
leadRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await leadService.delete(req.params.id as string, req.user!.sub);
    res.status(204).send();
  }),
);
