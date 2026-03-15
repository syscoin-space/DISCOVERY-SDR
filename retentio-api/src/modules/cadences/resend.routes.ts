/**
 * Rotas de configuração Resend por SDR + Webhook + Auditoria de emails.
 * Cada SDR gerencia sua própria chave API — multi-tenant.
 */

import { Router } from 'express';
import { z } from 'zod';
import { resendService } from './resend.service';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { asyncHandler, validate, authGuard } from '../../middlewares';

export const resendRouter = Router();

// ─── Webhook (NO auth — Resend calls this) ───────────────────────────

/**
 * POST /resend/webhook
 * Recebe eventos do Resend: email.sent, email.delivered, email.opened,
 * email.clicked, email.bounced, email.complained
 *
 * No Resend dashboard, configure o webhook URL:
 *   https://<api-domain>/api/resend/webhook
 */
resendRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const event = req.body;
    const eventType: string = event.type;
    const resendEmailId: string | undefined = event.data?.email_id;

    if (!eventType || !resendEmailId) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    logger.info(`Resend webhook: ${eventType} for email ${resendEmailId}`);

    // Find the interaction by external_id (Resend message ID)
    const interaction = await prisma.interaction.findFirst({
      where: { external_id: resendEmailId },
    });

    // Store event regardless of whether we find the interaction
    await prisma.emailEvent.create({
      data: {
        interaction_id: interaction?.id ?? null,
        resend_email_id: resendEmailId,
        type: eventType,
        data: event.data ?? null,
        link: eventType === 'email.clicked' ? event.data?.click?.link ?? null : null,
      },
    });

    // Update interaction status based on event
    if (interaction) {
      const statusMap: Record<string, string> = {
        'email.delivered': 'delivered',
        'email.opened': 'opened',
        'email.clicked': 'clicked',
        'email.bounced': 'bounced',
        'email.complained': 'complained',
      };

      const newStatus = statusMap[eventType];
      if (newStatus) {
        // Only upgrade status: sent → delivered → opened → clicked
        // But always set bounced/complained
        const statusPriority: Record<string, number> = {
          sent: 1,
          delivered: 2,
          opened: 3,
          clicked: 4,
          bounced: 0,
          complained: 0,
        };

        const currentPriority = statusPriority[interaction.status ?? 'sent'] ?? 0;
        const newPriority = statusPriority[newStatus] ?? 0;

        if (newPriority === 0 || newPriority > currentPriority) {
          await prisma.interaction.update({
            where: { id: interaction.id },
            data: { status: newStatus },
          });
        }
      }
    }

    res.json({ received: true });
  }),
);

// ─── Auth-protected routes below ─────────────────────────────────────

resendRouter.use(authGuard);

const configSchema = z.object({
  from_email: z.string().email(),
  from_name: z.string().max(80).optional(),
  api_key: z.string().min(20, 'API key parece inválida'),
  daily_limit: z.number().int().min(1).max(500).optional(),
});

const testSchema = z.object({
  to: z.string().email(),
});

// GET /resend/config
resendRouter.get(
  '/config',
  asyncHandler(async (req, res) => {
    const config = await resendService.getConfig(req.user!.sub);
    if (!config) {
      return res.status(404).json({ message: 'Configuração não encontrada' });
    }
    res.json(config);
  }),
);

// PUT /resend/config
resendRouter.put(
  '/config',
  validate(configSchema),
  asyncHandler(async (req, res) => {
    const config = await resendService.upsertConfig(req.user!.sub, req.body);
    res.json(config);
  }),
);

// POST /resend/test
resendRouter.post(
  '/test',
  validate(testSchema),
  asyncHandler(async (req, res) => {
    const result = await resendService.testConnection(req.user!.sub, req.body.to);
    res.json(result);
  }),
);

// ─── Email Audit / Tracking ──────────────────────────────────────────

// GET /resend/emails — lista emails enviados pelo SDR com status de tracking
resendRouter.get(
  '/emails',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const { lead_id, status, page = '1', limit = '50' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const where: Record<string, unknown> = {
      type: 'EMAIL',
      source: 'CADENCIA',
      lead: { sdr_id: userId },
      external_id: { not: null },
    };

    if (lead_id) where.lead_id = lead_id;
    if (status) where.status = status;

    const [emails, total] = await Promise.all([
      prisma.interaction.findMany({
        where,
        include: {
          lead: {
            select: { id: true, company_name: true, contact_name: true, email: true },
          },
          email_events: {
            orderBy: { created_at: 'asc' },
            select: { id: true, type: true, link: true, created_at: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.interaction.count({ where }),
    ]);

    res.json({
      data: emails,
      meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  }),
);

// GET /resend/emails/stats — resumo de tracking do SDR
resendRouter.get(
  '/emails/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const { days = '30' } = req.query as Record<string, string>;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const baseWhere = {
      type: 'EMAIL' as const,
      source: 'CADENCIA' as const,
      lead: { sdr_id: userId },
      external_id: { not: null },
      created_at: { gte: since },
    };

    const [total, delivered, opened, clicked, bounced] = await Promise.all([
      prisma.interaction.count({ where: baseWhere }),
      prisma.interaction.count({ where: { ...baseWhere, status: { in: ['delivered', 'opened', 'clicked'] } } }),
      prisma.interaction.count({ where: { ...baseWhere, status: { in: ['opened', 'clicked'] } } }),
      prisma.interaction.count({ where: { ...baseWhere, status: 'clicked' } }),
      prisma.interaction.count({ where: { ...baseWhere, status: 'bounced' } }),
    ]);

    res.json({
      period_days: parseInt(days),
      total_sent: total,
      delivered,
      opened,
      clicked,
      bounced,
      open_rate: total > 0 ? Math.round((opened / total) * 100) : 0,
      click_rate: total > 0 ? Math.round((clicked / total) * 100) : 0,
      bounce_rate: total > 0 ? Math.round((bounced / total) * 100) : 0,
    });
  }),
);
