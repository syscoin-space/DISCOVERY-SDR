import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, validate, authGuard, getTenantId, getMembershipId } from '../../middlewares';
import { roleGuard } from '../../middlewares/auth';
import { leadService } from './lead.service';
import { prisma } from '../../config/prisma';
import { LeadStatus, Role, InteractionType } from '@prisma/client';
import { createLeadSchema, updateLeadSchema, updateLeadStatusSchema, leadFiltersSchema, createInteractionSchema, bulkAssignLeadSchema } from './lead.schema';
import { AppError } from '../../shared/types';
import { importFromBuffer } from './lead.import';
import { createTouchpoint } from './touchpoint.service';

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
      'application/octet-stream',
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Apenas arquivos .csv e .xlsx são aceitos', 'INVALID_FILE_TYPE'));
    }
  },
});

// POST /leads/import
leadRouter.post(
  '/import',
  roleGuard(Role.MANAGER, Role.OWNER, Role.ADMIN),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'Arquivo ausente (field: "file")', 'FILE_MISSING');
    
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    
    const result = await importFromBuffer(req.file.buffer, req.file.mimetype, tenantId, membershipId, req.file.originalname);
    
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
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const result = await leadService.list(tenantId, req.query as any, membershipId, req.user!.role);
    res.json(result);
  }),
);

// GET /leads/pipeline-counts
leadRouter.get(
  '/pipeline-counts',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const filteredSdrId = req.query.sdr_id as string | undefined;
    const counts = await leadService.pipelineCounts(tenantId, membershipId, req.user!.role, filteredSdrId);
    res.json(counts);
  }),
);

// GET /leads/:id
leadRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const lead = await leadService.getById(req.params.id as string, tenantId, membershipId, req.user?.role);
    res.json(lead);
  }),
);

// GET /leads/:id/history
leadRouter.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const id = req.params.id as string;
    
    // Check access constraint if SDR
    if (req.user?.role === 'SDR') {
      const membershipId = getMembershipId(req);
      const lead = await prisma.lead.findFirst({ where: { id, tenant_id: tenantId } });
      if (!lead || lead.sdr_id !== membershipId) {
        throw new AppError(403, 'Você não tem permissão para acessar o histórico deste lead', 'LEAD_FORBIDDEN');
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        tenant_id: tenantId,
        lead_id: id,
        action: 'LEAD_STATUS_CHANGED'
      },
      orderBy: { created_at: 'desc' },
    });

    const membershipIds = Array.from(new Set(logs.map(l => l.user_id).filter(Boolean))) as string[];
    const memberships = await prisma.membership.findMany({
      where: { id: { in: membershipIds } },
      include: { user: { select: { name: true, avatar_url: true } } }
    });
    
    const usersMap = new Map(memberships.map(m => [m.id, { name: m.user.name, avatar_url: m.user.avatar_url }]));

    const enrichedLogs = logs.map(log => ({
      ...log,
      user: log.user_id ? usersMap.get(log.user_id) : null,
    }));

    res.json(enrichedLogs);
  }),
);

// ─── Interactions ───────────────────────────────────────────────

// GET /leads/:id/interactions
leadRouter.get(
  '/:id/interactions',
  asyncHandler(async (req, res) => {
    const { id: leadId } = req.params as { id: string };
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const role = req.user?.role;

    const where: any = { id: leadId, tenant_id: tenantId };
    if (role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        where.OR = [
          { sdr_id: membershipId },
          { status: 'BANCO' },
          { sdr_id: null }
        ];
      }
    }

    const lead = await prisma.lead.findFirst({ where, select: { id: true } });
    if (!lead) throw new AppError(404, 'Lead não encontrado ou acesso restrito');

    const { type, cursor, limit = 20 } = req.query as any;

    const interactionWhere: any = {
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
      where: interactionWhere,
      orderBy: { created_at: 'desc' },
      take: Number(limit) + 1,
    });

    const hasNext = items.length > Number(limit);
    if (hasNext) items.pop();

    res.json({
      items,
      next_cursor: hasNext ? items[items.length - 1]?.id : null,
      count: items.length,
    });
  }),
);

// POST /leads/:id/interactions
leadRouter.post(
  '/:id/interactions',
  validate(createInteractionSchema),
  asyncHandler(async (req, res) => {
    const { id: leadId } = req.params as { id: string };
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const role = req.user?.role;

    const where: any = { id: leadId, tenant_id: tenantId };
    if (role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        where.OR = [
          { sdr_id: membershipId },
          { status: 'BANCO' },
          { sdr_id: null }
        ];
      }
    }

    const lead = await prisma.lead.findFirst({ where, select: { id: true } });
    if (!lead) throw new AppError(404, 'Lead não encontrado ou acesso restrito');

    const interaction = await prisma.interaction.create({
      data: {
        ...req.body,
        lead_id: leadId,
        tenant_id: tenantId,
        membership_id: membershipId,
        source: 'MANUAL',
      },
    });

    res.status(201).json(interaction);
  }),
);

// GET /leads/:id/interactions/summary/counts
leadRouter.get(
  '/:id/interactions/summary/counts',
  asyncHandler(async (req, res) => {
    const { id: leadId } = req.params as { id: string };
    const tenantId = getTenantId(req);

    const counts = await prisma.interaction.groupBy({
      by: ['type'],
      where: { lead_id: leadId, tenant_id: tenantId },
      _count: { _all: true },
    });

    const summary = counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = row._count._all;
      return acc;
    }, {});

    res.json({
      lead_id: leadId,
      summary,
      total: Object.values(summary).reduce((a, b) => a + b, 0),
    });
  }),
);

// POST /leads
leadRouter.post(
  '/',
  validate(createLeadSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const lead = await leadService.create(tenantId, membershipId, req.body);
    res.status(201).json(lead);
  }),
);

// POST /leads/bulk-assign
leadRouter.post(
  '/bulk-assign',
  roleGuard(Role.MANAGER, Role.OWNER, Role.ADMIN),
  validate(bulkAssignLeadSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const result = await leadService.bulkAssign(tenantId, req.body.leadIds, req.body.sdrId, membershipId);
    res.json(result);
  }),
);

// PATCH /leads/:id
leadRouter.patch(
  '/:id',
  validate(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const lead = await leadService.update(req.params.id as string, tenantId, req.body, membershipId, req.user?.role);
    res.json(lead);
  }),
);

// PATCH /leads/:id/status
leadRouter.patch(
  '/:id/status',
  validate(updateLeadStatusSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const lead = await leadService.updateStatus(req.params.id as string, tenantId, req.body.status, membershipId, req.user?.role);
    res.json(lead);
  }),
);

// DELETE /leads/:id
leadRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const result = await leadService.delete(req.params.id as string, tenantId, membershipId, req.user?.role);
    res.json(result);
  }),
);


// GET /leads/:id/touchpoints
leadRouter.get(
  '/:id/touchpoints',
  asyncHandler(async (req, res) => {
    const lead_id = req.params.id as string;
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    const whereClause: any = { lead_id, tenant_id: tenantId };
    if (req.user?.role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        whereClause.lead = { sdr_id: membershipId };
      }
    }

    const tps = await prisma.touchpoint.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    res.json(tps);
  }),
);

// POST /leads/:id/touchpoints
leadRouter.post(
  '/:id/touchpoints',
  asyncHandler(async (req, res) => {
    const lead_id = req.params.id as string;
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    const whereClause: any = { id: lead_id, tenant_id: tenantId };
    if (req.user?.role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        whereClause.sdr_id = membershipId;
      }
    }

    const lead = await prisma.lead.findFirst({ where: whereClause });
    if (!lead) throw new AppError(404, 'Lead não encontrado ou acesso restrito');

    try {
      const tp = await createTouchpoint({
        ...req.body,
        touchpoint_type: req.body.touchpoint_type || 'MANUAL',
        lead_id,
        membership_id: membershipId,
      });
      res.status(201).json(tp);
    } catch (error: any) {
      if (error.code === 'P2002' || error.name === 'PrismaClientValidationError') {
        throw new AppError(400, 'Dados inválidos para o touchpoint. Verifique o resultado selecionado.');
      }
      throw error;
    }
  }),
);

// ─── Stack (Plataformas) ────────────────────────────────────────

// GET /leads/:id/stack
leadRouter.get(
  '/:id/stack',
  asyncHandler(async (req, res) => {
    res.json([]);
  }),
);

// POST /leads/:id/stack
leadRouter.post(
  '/:id/stack',
  asyncHandler(async (req, res) => {
    res.status(201).json({ id: 'dummy', category: req.body.category, tool_name: req.body.tool_name });
  }),
);

// DELETE /leads/:id/stack/:toolId
leadRouter.delete(
  '/:id/stack/:toolId',
  asyncHandler(async (req, res) => {
    res.status(204).send();
  }),
);

// ── AI Assisted Routes ──────────────────────────────────────────

// POST /leads/:id/ai/analyze
leadRouter.post(
  '/:id/ai/analyze',
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const { aiService } = await import('../ai/ai.service');

    const whereClause: any = { id, tenant_id: tenantId };
    if (req.user?.role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        whereClause.sdr_id = membershipId;
      }
    }

    const lead = await prisma.lead.findFirst({ where: whereClause });
    if (!lead) throw new AppError(404, 'Lead não encontrado ou acesso restrito');

    const notes = lead.discovery_notes || lead.notes || '';
    const suggestion = await aiService.analyzeDiscovery(id, tenantId, notes);

    res.json({ success: true, suggestion });
  }),
);

// POST /leads/:id/ai/accept
leadRouter.post(
  '/:id/ai/accept',
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const { edited_data } = req.body;

    const whereClause: any = { id, tenant_id: tenantId };
    if (req.user?.role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        whereClause.sdr_id = membershipId;
      }
    }

    const lead = await prisma.lead.findFirst({ where: whereClause });
    if (!lead || !lead.ai_metadata) throw new AppError(404, 'Lead ou sugestões não encontrados ou acesso restrito');

    const metadata = lead.ai_metadata as any;
    const suggestion = metadata.last_suggestion;

    if (!suggestion || suggestion.status === 'ACCEPTED' || suggestion.status === 'REJECTED') {
      throw new AppError(400, 'Nenhuma sugestão pendente');
    }

    // Mesclar a sugestão base com as edições do SDR (se houver)
    const baseEnrichment = suggestion.enrichment_data || {};
    const finalData = { ...baseEnrichment, ...(edited_data || {}) };

    const updateData: any = {
      ...finalData,
      // Se sugeriu status e não retrocede, aplicar (podendo vir do edited_data)
      discovery_status: finalData.suggested_status || suggestion.suggested_status || lead.discovery_status,
      ai_metadata: {
        ...metadata,
        last_suggestion: { ...suggestion, status: 'ACCEPTED' }
      }
    };

    // Remove properties not existent on Lead model from finalData just in case
    delete updateData.suggested_status;
    delete updateData.suggested_outcome;
    delete updateData.intent_classification;

    const updatedLead = await prisma.lead.update({
      where: { id: id as string },
      data: updateData
    });

    // ── Governance: Audit Log ───────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: getMembershipId(req),
        lead_id: id as string,
        action: 'AI_SUGGESTION_ACCEPTED',
        entity_type: 'Lead',
        entity_id: id as string,
        old_value: {
          dm_name: lead.dm_name,
          discovery_status: lead.discovery_status,
        } as any,
        new_value: {
          dm_name: updatedLead.dm_name,
          discovery_status: updatedLead.discovery_status,
          is_edited_by_human: !!edited_data,
          ai_confidence: suggestion.confidence
        } as any,
      }
    });

    res.json({ success: true, lead: updatedLead });
  }),
);

// POST /leads/:id/ai/reject
leadRouter.post(
  '/:id/ai/reject',
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    const whereClause: any = { id, tenant_id: tenantId };
    if (req.user?.role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        whereClause.sdr_id = membershipId;
      }
    }

    const lead = await prisma.lead.findFirst({ where: whereClause });
    if (!lead || !lead.ai_metadata) throw new AppError(404, 'Lead ou sugestões não encontrados ou acesso restrito');

    const metadata = lead.ai_metadata as any;
    const suggestion = metadata.last_suggestion;

    if (!suggestion || suggestion.status === 'ACCEPTED' || suggestion.status === 'REJECTED') {
      throw new AppError(400, 'Nenhuma sugestão pendente');
    }

    // Apenas marca como REJECTED
    await prisma.lead.update({
      where: { id: id as string },
      data: {
        ai_metadata: {
          ...metadata,
          last_suggestion: { ...suggestion, status: 'REJECTED' }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: getMembershipId(req),
        lead_id: id as string,
        action: 'AI_SUGGESTION_REJECTED',
        entity_type: 'Lead',
        entity_id: id as string,
        old_value: {} as any,
        new_value: { reason: 'User dismissed AI suggestion' } as any,
      }
    });

    res.json({ success: true });
  }),
);

// GET /leads/:id/ai/handoff-summary
leadRouter.get(
  '/:id/ai/handoff-summary',
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const tenantId = getTenantId(req);
    const { aiService } = await import('../ai/ai.service');

    const summary = await aiService.generateHandoffSummary(id, tenantId);
    res.json({ success: true, summary });
  }),
);

// GET /leads/:id/ai/guidance
leadRouter.get(
  '/:id/ai/guidance',
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const tenantId = getTenantId(req);
    const { aiService } = await import('../ai/ai.service');

    const lead = await prisma.lead.findFirst({ where: { id, tenant_id: tenantId } });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    const guidance = await aiService.getAIGuidance(lead);
    res.json({ success: true, guidance });
  }),
);
