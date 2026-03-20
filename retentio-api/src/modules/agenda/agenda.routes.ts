import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler, getTenantId, getMembershipId, authGuard } from '../../middlewares';
import { Role, TaskStatus } from '@prisma/client';

export const agendaRouter = Router();
agendaRouter.use(authGuard);

// ── GET /agenda — events for a date range ──
agendaRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const inicio = req.query.inicio as string;
    const fim = req.query.fim as string;
    const closerId = req.query.closer_id as string | undefined;

    if (!inicio || !fim) {
      return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    }

    const startDate = new Date(inicio);
    const endDate = new Date(fim);

    // 1. CalendarEvent (CRM meetings)
    const reunioesWhere: any = {
      lead: { tenant_id: tenantId },
      inicio: { gte: startDate, lte: endDate },
    };

    if (closerId) {
      reunioesWhere.closer_id = closerId;
    } else {
      reunioesWhere.OR = [
        { closer_id: membershipId },
        { sdr_id: membershipId },
      ];
    }

    const reunioes = await prisma.calendarEvent.findMany({
      where: reunioesWhere,
      orderBy: { inicio: 'asc' },
      include: {
        lead: {
          select: { id: true, company_name: true, contact_name: true, email: true },
        },
      },
    });

    // 2. Tasks with scheduled_at in range (Combined ContactTasks & CadenceSteps in V2)
    const tasks = await prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        membership_id: membershipId,
        scheduled_at: { gte: startDate, lte: endDate },
        status: { in: [TaskStatus.PENDENTE, TaskStatus.EM_ANDAMENTO, TaskStatus.ATRASADA] },
      },
      orderBy: { scheduled_at: 'asc' },
      include: {
        lead: {
          select: { id: true, company_name: true, contact_name: true, email: true, status: true },
        },
      },
    });

    // 3. Google Calendar events (Simulated for V2 foundation)
    // In V2 we'll use membership_id for google integration lookup
    let google_events: any[] = [];
    const targetMembershipId = closerId ?? membershipId;
    const integration = await prisma.googleIntegration.findUnique({
      where: { membership_id: targetMembershipId },
      select: { active: true },
    });

    // google_service call would be here, but using placeholder or empty for now
    // as we are refactoring existing structure first.
    // google_events = await listGoogleCalendarEventsForMembership(targetMembershipId, startDate, endDate);

    res.json({ 
      reunioes, 
      tasks, // replaces contatos and steps from V1
      google_events 
    });
  }),
);

// ── GET /agenda/closers — memberships with roles CLOSER or MANAGER in this tenant ──
agendaRouter.get(
  '/closers',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const closers = await prisma.membership.findMany({
      where: {
        tenant_id: tenantId,
        role: { in: [Role.CLOSER, Role.MANAGER, Role.OWNER] },
        active: true,
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        },
        google_integration: {
          select: { google_email: true, active: true },
        },
      },
    });

    const result = closers.map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      google_email: m.google_integration?.active ? m.google_integration.google_email : null,
      avatar_initials: m.user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    }));

    res.json(result);
  }),
);
