import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, validate, authGuard, getTenantId, getMembershipId } from '../../middlewares';
import { AppError } from '../../shared/types';
import { InteractionType, InteractionSource, LeadStatus } from '@prisma/client';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getCloserAvailability,
  createCalendarEvent,
  cancelCalendarEvent,
  listGoogleCalendarEvents,
  sendGmailEmail,
} from './google.service';

export const googleRouter = Router();

// ─── OAuth Flow ───────────────────────────────────────────────────────

// GET /google/auth-url — gera URL de autorização
googleRouter.get(
  '/auth-url',
  authGuard,
  asyncHandler(async (req, res) => {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(500, 'Google OAuth não configurado no servidor', 'GOOGLE_NOT_CONFIGURED');
    }
    const membershipId = getMembershipId(req);
    const url = getAuthUrl(membershipId);
    res.json({ url });
  }),
);

// GET /google/callback — callback do OAuth
googleRouter.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state: membershipId } = req.query as { code?: string; state?: string };

    if (!code || !membershipId) {
      throw new AppError(400, 'Parâmetros inválidos no callback', 'INVALID_CALLBACK');
    }

    await exchangeCodeForTokens(code, membershipId);

    // Redirect para o frontend
    const frontendUrl = env.CORS_ORIGIN || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/configuracoes?google=connected`);
  }),
);

// GET /google/status — verifica se o usuário tem Google conectado
googleRouter.get(
  '/status',
  authGuard,
  asyncHandler(async (req, res) => {
    const membershipId = getMembershipId(req);
    const integration = await prisma.googleIntegration.findUnique({
      where: { membership_id: membershipId },
      select: { google_email: true, scopes: true, active: true },
    });

    if (!integration || !integration.active) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      email: integration.google_email,
      scopes: integration.scopes,
    });
  }),
);

// DELETE /google/disconnect — desconecta Google
googleRouter.delete(
  '/disconnect',
  authGuard,
  asyncHandler(async (req, res) => {
    const membershipId = getMembershipId(req);
    await prisma.googleIntegration.deleteMany({
      where: { membership_id: membershipId },
    });
    res.json({ success: true });
  }),
);

// ─── Calendar ─────────────────────────────────────────────────────────

const availabilitySchema = z.object({
  closerMembershipId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().min(15).max(180).default(60),
});

googleRouter.get(
  '/calendar/availability',
  authGuard,
  asyncHandler(async (req, res) => {
    const { closerMembershipId, date, duration } = availabilitySchema.parse(req.query);
    const slots = await getCloserAvailability(closerMembershipId, new Date(date), duration);
    res.json(slots);
  }),
);

const createEventSchema = z.object({
  leadId: z.string().uuid(),
  closerMembershipId: z.string().uuid(),
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
  convidados: z.array(z.string().email()).default([]),
  criarMeet: z.boolean().default(true),
});

googleRouter.post(
  '/calendar/events',
  authGuard,
  validate(createEventSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const sdrMembershipId = getMembershipId(req);
    const { leadId, closerMembershipId, titulo, descricao, inicio, fim, convidados, criarMeet } = req.body;

    const result = await createCalendarEvent({
      closerMembershipId,
      sdrMembershipId,
      leadId,
      titulo,
      descricao,
      inicio: new Date(inicio),
      fim: new Date(fim),
      convidadosEmails: convidados,
      criarGoogleMeet: criarMeet,
    });

    // Interaction inside the tenant
    await prisma.interaction.create({
      data: {
        tenant_id: tenantId,
        lead_id: leadId,
        type: InteractionType.REUNIAO,
        source: InteractionSource.MANUAL,
        subject: titulo,
        body: descricao ?? `Reunião agendada via Google Calendar`,
        metadata: { google_event_id: result.eventId, meet_link: result.meetLink },
      },
    });

    // Move lead to REUNIAO_MARCADA (V2 status)
    await prisma.lead.update({
      where: { id: leadId, tenant_id: tenantId },
      data: { status: LeadStatus.REUNIAO_MARCADA },
    });

    res.status(201).json(result);
  }),
);

// DELETE /google/calendar/events/:id
googleRouter.delete(
  '/calendar/events/:id',
  authGuard,
  asyncHandler(async (req, res) => {
    const membershipId = getMembershipId(req);
    const eventId = req.params.id as string;
    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError(404, 'Evento não encontrado');

    // Security: check if membership participates in the event
    if (event.closer_id !== membershipId && event.sdr_id !== membershipId) {
      throw new AppError(403, 'Sem permissão para cancelar este evento');
    }

    await cancelCalendarEvent(event.closer_id!, eventId);
    res.json({ success: true });
  }),
);

// ─── Gmail ────────────────────────────────────────────────────────────

const gmailSendSchema = z.object({
  leadId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

googleRouter.post(
  '/gmail/send',
  authGuard,
  validate(gmailSendSchema),
  asyncHandler(async (req, res) => {
    const membershipId = getMembershipId(req);
    const { leadId, to, subject, body } = req.body;

    const result = await sendGmailEmail({
      membershipId,
      to,
      subject,
      htmlBody: body.replace(/\n/g, '<br>'),
    });

    // Create interaction
    await prisma.interaction.create({
      data: {
        tenant_id: getTenantId(req),
        lead_id: leadId,
        type: InteractionType.EMAIL,
        source: InteractionSource.MANUAL,
        external_id: result.messageId,
        subject,
        body,
        status: 'SENT',
        metadata: { via: 'gmail' },
      },
    });

    res.json({ success: true, message_id: result.messageId });
  }),
);
