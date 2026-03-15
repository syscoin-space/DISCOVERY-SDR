import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, validate, authGuard } from '../../middlewares';
import { AppError } from '../../shared/types';
import { InteractionType, InteractionSource } from '@prisma/client';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getCloserAvailability,
  createCalendarEvent,
  cancelCalendarEvent,
  listCalendarEvents,
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
    const url = getAuthUrl(req.user!.sub);
    res.json({ url });
  }),
);

// GET /google/callback — callback do OAuth (sem authGuard, é redirect do Google)
googleRouter.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state: userId } = req.query as { code?: string; state?: string };

    if (!code || !userId) {
      throw new AppError(400, 'Parâmetros inválidos no callback', 'INVALID_CALLBACK');
    }

    await exchangeCodeForTokens(code, userId);

    // Redirect para o frontend com indicador de sucesso
    const frontendUrl = env.CORS_ORIGIN || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/configuracoes?google=connected`);
  }),
);

// GET /google/status — verifica se o usuário tem Google conectado
googleRouter.get(
  '/status',
  authGuard,
  asyncHandler(async (req, res) => {
    const integration = await prisma.googleIntegration.findUnique({
      where: { user_id: req.user!.sub },
      select: { google_email: true, escopos: true, ativo: true },
    });

    if (!integration || !integration.ativo) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      email: integration.google_email,
      escopos: integration.escopos,
    });
  }),
);

// DELETE /google/disconnect — desconecta Google
googleRouter.delete(
  '/disconnect',
  authGuard,
  asyncHandler(async (req, res) => {
    await prisma.googleIntegration.deleteMany({
      where: { user_id: req.user!.sub },
    });
    res.json({ success: true });
  }),
);

// ─── Calendar ─────────────────────────────────────────────────────────

// GET /google/calendar/availability
const availabilitySchema = z.object({
  closerUserId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().min(15).max(180).default(60),
});

googleRouter.get(
  '/calendar/availability',
  authGuard,
  asyncHandler(async (req, res) => {
    const { closerUserId, date, duration } = availabilitySchema.parse(req.query);
    const slots = await getCloserAvailability(closerUserId, new Date(date), duration);
    res.json(slots);
  }),
);

// POST /google/calendar/events
const createEventSchema = z.object({
  leadId: z.string().uuid(),
  closerUserId: z.string().uuid(),
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
    const { leadId, closerUserId, titulo, descricao, inicio, fim, convidados, criarMeet } = req.body;

    const result = await createCalendarEvent({
      closerUserId,
      sdrUserId: req.user!.sub,
      leadId,
      titulo,
      descricao,
      inicio: new Date(inicio),
      fim: new Date(fim),
      convidadosEmails: convidados,
      criarGoogleMeet: criarMeet,
    });

    // Register interaction
    await prisma.interaction.create({
      data: {
        lead_id: leadId,
        type: InteractionType.REUNIAO,
        source: InteractionSource.MANUAL,
        subject: titulo,
        body: descricao ?? `Reunião agendada via Google Calendar`,
        metadata: { google_event_id: result.eventId, meet_link: result.meetLink },
      },
    });

    // Move lead to REUNIAO_AGENDADA
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'REUNIAO_AGENDADA' },
    });

    res.status(201).json(result);
  }),
);

// DELETE /google/calendar/events/:id
googleRouter.delete(
  '/calendar/events/:id',
  authGuard,
  asyncHandler(async (req, res) => {
    const eventId = req.params.id as string;
    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError(404, 'Evento não encontrado');

    // Allow closer or SDR to cancel
    if (event.closer_user_id !== req.user!.sub && event.sdr_user_id !== req.user!.sub) {
      throw new AppError(403, 'Sem permissão para cancelar este evento');
    }

    await cancelCalendarEvent(event.closer_user_id, eventId);
    res.json({ success: true });
  }),
);

// GET /google/calendar/events
googleRouter.get(
  '/calendar/events',
  authGuard,
  asyncHandler(async (req, res) => {
    const leadId = req.query.leadId as string | undefined;
    const events = await listCalendarEvents(req.user!.sub, leadId);
    res.json(events);
  }),
);

// ─── Gmail ────────────────────────────────────────────────────────────

const gmailSendSchema = z.object({
  leadId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  templateId: z.string().uuid().optional(),
});

googleRouter.post(
  '/gmail/send',
  authGuard,
  validate(gmailSendSchema),
  asyncHandler(async (req, res) => {
    const { leadId, to, subject, body, templateId } = req.body;

    const result = await sendGmailEmail({
      sdrUserId: req.user!.sub,
      to,
      subject,
      htmlBody: body.replace(/\n/g, '<br>'),
    });

    // Create interaction
    await prisma.interaction.create({
      data: {
        lead_id: leadId,
        type: InteractionType.EMAIL,
        source: InteractionSource.MANUAL,
        external_id: result.messageId,
        subject,
        body,
        status: 'SENT',
        metadata: templateId ? { template_id: templateId, via: 'gmail' } : { via: 'gmail' },
      },
    });

    res.json({ success: true, message_id: result.messageId });
  }),
);
