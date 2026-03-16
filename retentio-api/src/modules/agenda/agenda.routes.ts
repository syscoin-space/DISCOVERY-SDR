import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../middlewares';
import { listGoogleCalendarEventsForUser } from '../google/google.service';

export const agendaRouter = Router();

// ── GET /agenda — events for a date range ──
agendaRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const inicio = req.query.inicio as string;
    const fim = req.query.fim as string;
    const closerId = req.query.closer_id as string | undefined;

    if (!inicio || !fim) {
      return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    }

    const startDate = new Date(inicio);
    const endDate = new Date(fim);

    // 1. CalendarEvent (CRM meetings)
    const reunioesWhere: Record<string, unknown> = {
      inicio: { gte: startDate, lte: endDate },
    };
    if (closerId) {
      reunioesWhere.closer_user_id = closerId;
    } else {
      reunioesWhere.OR = [
        { closer_user_id: userId },
        { sdr_user_id: userId },
      ];
    }

    const reunioes = await prisma.calendarEvent.findMany({
      where: reunioesWhere,
      orderBy: { inicio: 'asc' },
      include: {
        lead: {
          select: { id: true, company_name: true, contact_name: true, email: true, niche: true },
        },
      },
    });

    // 2. DailyTasks with proximo_contato
    const contatos = await prisma.dailyTask.findMany({
      where: {
        sdr_id: userId,
        proximo_contato: { gte: startDate, lte: endDate },
      },
      orderBy: { proximo_contato: 'asc' },
      include: {
        lead: {
          select: { id: true, company_name: true, contact_name: true, email: true, niche: true, status: true },
        },
      },
    });

    // 3. Cadence steps scheduled in range
    const steps = await prisma.leadCadenceStep.findMany({
      where: {
        scheduled_at: { gte: startDate, lte: endDate },
        status: { in: ['PENDENTE', 'ATRASADO'] },
        lead_cadence: {
          lead: { sdr_id: userId },
          status: 'ATIVA',
        },
      },
      orderBy: { scheduled_at: 'asc' },
      include: {
        cadence_step: {
          select: {
            step_order: true,
            day_offset: true,
            channel: true,
            cadence: { select: { id: true, name: true } },
          },
        },
        lead_cadence: {
          select: {
            lead: {
              select: { id: true, company_name: true, contact_name: true, email: true },
            },
          },
        },
      },
    });

    // 4. Google Calendar events (if user has Google connected)
    let google_events: unknown[] = [];
    const targetUserId = closerId ?? userId;
    const integration = await prisma.googleIntegration.findUnique({
      where: { user_id: targetUserId },
      select: { ativo: true },
    });

    if (integration?.ativo) {
      google_events = await listGoogleCalendarEventsForUser(targetUserId, startDate, endDate);
    }

    res.json({ reunioes, contatos, steps, google_events });
  }),
);

// ── GET /agenda/closers — users with Google connected ──
agendaRouter.get(
  '/closers',
  asyncHandler(async (_req, res) => {
    const closers = await prisma.user.findMany({
      where: {
        role: { in: ['CLOSER', 'GESTOR'] },
        google_integration: { ativo: true },
      },
      select: {
        id: true,
        name: true,
        email: true,
        google_integration: {
          select: { google_email: true },
        },
      },
    });

    const result = closers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      google_email: c.google_integration?.google_email ?? null,
      avatar_initials: c.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    }));

    res.json(result);
  }),
);
