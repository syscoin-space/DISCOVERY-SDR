import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, getTenantId, authGuard } from '../../middlewares';
import { AppError } from '../../shared/types';
import { Role, TaskStatus } from '@prisma/client';

export const gestorRouter = Router();

// ─── GET /gestor/dashboard ───
gestorRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() || 7) + 1); // Monday

    // All active memberships in this tenant with SDR role
    const sdrs = await prisma.membership.findMany({
      where: { tenant_id: tenantId, role: Role.SDR, active: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const sdrMembershipIds = sdrs.map((s) => s.id);

    // Today's tasks for these SDRs
    const todayTasks = await prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        membership_id: { in: sdrMembershipIds },
        OR: [
          { scheduled_at: { gte: startOfDay } },
          { scheduled_at: null, created_at: { gte: startOfDay } },
        ],
      },
    });

    const totalTasks = todayTasks.length;
    const completedTasks = todayTasks.filter((t) => t.status === TaskStatus.CONCLUIDA).length;
    const pendingTasks = todayTasks.filter((t) => t.status === TaskStatus.PENDENTE || t.status === TaskStatus.EM_ANDAMENTO).length;

    // This week's meetings (Touchpoints of type booking/meeting or tasks with type MEETING)
    const weekMeetings = await prisma.task.count({
      where: {
        tenant_id: tenantId,
        membership_id: { in: sdrMembershipIds },
        scheduled_at: { gte: startOfWeek },
        type: 'MEETING',
      },
    });

    // This week's handoffs
    const weekHandoffs = await prisma.handoffBriefing.count({
      where: {
        lead: { tenant_id: tenantId },
        sdr_id: { in: sdrMembershipIds },
        created_at: { gte: startOfWeek },
      },
    });

    // Funnel context
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: { tenant_id: tenantId },
      _count: true,
    });

    const funnel = leadsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Per-SDR summary for today
    const sdrSummaries = sdrs.map((membership) => {
      const sdrTasks = todayTasks.filter((t) => t.membership_id === membership.id);
      const done = sdrTasks.filter((t) => t.status === TaskStatus.CONCLUIDA).length;
      return {
        id: membership.id,
        name: membership.user.name,
        total: sdrTasks.length,
        done,
        pending: sdrTasks.filter((t) => t.status === TaskStatus.PENDENTE).length,
        completion_pct: sdrTasks.length > 0 ? Math.round((done / sdrTasks.length) * 100) : 0,
      };
    });

    res.json({
      today: {
        total_tasks: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        completion_pct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      week: {
        meetings: weekMeetings,
        handoffs: weekHandoffs,
      },
      funnel,
      sdr_summaries: sdrSummaries,
    });
  }),
);

// ─── GET /gestor/sdrs ───
gestorRouter.get(
  '/sdrs',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const sdrs = await prisma.membership.findMany({
      where: { tenant_id: tenantId, role: Role.SDR, active: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    
    // Map to flat GestorSdr shape as expected by the frontend
    const flatSdrs = sdrs.map(membership => ({
      id: membership.id,
      name: membership.user.name,
      email: membership.user.email,
    }));

    res.json(flatSdrs);
  }),
);

// ─── GOALS (Formerly METAS) CRUD ───

const createGoalSchema = z.object({
  membership_id: z.string().uuid().nullable().optional(),
  type: z.string().min(1),
  target: z.number().int().positive(),
  period: z.string().min(1),
});

const updateGoalSchema = z.object({
  target: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

// GET /gestor/goals
gestorRouter.get(
  '/goals',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const goals = await prisma.goal.findMany({
      where: { tenant_id: tenantId },
      include: { 
        tenant: { select: { name: true } }
      },
      orderBy: [{ type: 'asc' }, { created_at: 'desc' }],
    });
    res.json(goals);
  }),
);

// POST /gestor/goals
gestorRouter.post(
  '/goals',
  validate(createGoalSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const goal = await prisma.goal.create({
      data: {
        ...req.body,
        tenant_id: tenantId,
      },
    });
    res.status(201).json(goal);
  }),
);

// PATCH /gestor/goals/:id
gestorRouter.patch(
  '/goals/:id',
  validate(updateGoalSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const existing = await prisma.goal.findFirst({ 
      where: { id: req.params.id as string, tenant_id: tenantId } 
    });
    if (!existing) throw new AppError(404, 'Meta não encontrada');

    const goal = await prisma.goal.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(goal);
  }),
);

// DELETE /gestor/goals/:id
gestorRouter.delete(
  '/goals/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const existing = await prisma.goal.findFirst({ 
      where: { id: req.params.id as string, tenant_id: tenantId } 
    });
    if (!existing) throw new AppError(404, 'Meta não encontrada');

    await prisma.goal.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  }),
);
