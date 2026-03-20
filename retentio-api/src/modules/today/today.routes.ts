import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard, getTenantId, getMembershipId } from '../../middlewares';
import { AppError } from '../../shared/types';
import { TaskStatus, TaskType } from '@prisma/client';
import { eventBus } from '../../shared/events/event-bus';
import { DomainEvent } from '../../shared/events/domain-events';

export const todayRouter = Router();
todayRouter.use(authGuard);

// ─── Helpers ─────────────────────────────────────────────────────────

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// ─── Schemas ─────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  lead_id: z.string().uuid(),
  type: z.nativeEnum(TaskType).default(TaskType.MANUAL),
  title: z.string(),
  description: z.string().optional(),
  channel: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  outcome: z.string().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  channel: z.string().nullable().optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET /today/summary
todayRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const { start, end } = todayRange();

    const tasks = await prisma.task.groupBy({
      by: ['status'],
      where: {
        tenant_id: tenantId,
        membership_id: membershipId,
        OR: [
          { scheduled_at: { gte: start, lt: end } },
          { scheduled_at: null, created_at: { gte: start, lt: end } },
        ],
      },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const group of tasks) {
      statusCounts[group.status] = group._count;
      total += group._count;
    }

    const pendente = statusCounts[TaskStatus.PENDENTE] ?? 0;
    const em_andamento = statusCounts[TaskStatus.EM_ANDAMENTO] ?? 0;
    const concluida = statusCounts[TaskStatus.CONCLUIDA] ?? 0;
    const cancelada = statusCounts[TaskStatus.CANCELADA] ?? 0;

    res.json({
      total,
      pendente: pendente + em_andamento,
      concluidos: concluida,
      cancelados: cancelada,
      detalhado: {
        pendente,
        em_andamento,
        concluida,
        cancelada,
      }
    });
  }),
);

// GET /today/tasks (Alias)
todayRouter.get('/tasks', asyncHandler(async (req, res) => {
  // Just reuse the logic from GET /
  const tenantId = getTenantId(req);
  const membershipId = getMembershipId(req);
  const { start, end } = todayRange();

  const tasks = await prisma.task.findMany({
    where: {
      tenant_id: tenantId,
      membership_id: membershipId,
      status: { in: [TaskStatus.PENDENTE, TaskStatus.EM_ANDAMENTO, TaskStatus.ATRASADA] },
      OR: [
        { scheduled_at: { gte: start, lt: end } },
        { scheduled_at: null },
        { scheduled_at: { lt: start } },
      ],
    },
    include: {
      lead: {
        select: {
          id: true,
          company_name: true,
          domain: true,
          icp_score: true,
          whatsapp: true,
          email: true,
          phone: true,
          status: true,
          contact_name: true,
        },
      },
    },
    orderBy: [
      { scheduled_at: { sort: 'asc', nulls: 'last' } },
      { created_at: 'asc' },
    ],
  });

  tasks.sort((a, b) => (b.lead?.icp_score ?? 0) - (a.lead?.icp_score ?? 0));
  res.json(tasks);
}));

// GET /today — Fila de contato
todayRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const { start, end } = todayRange();

    const tasks = await prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        membership_id: membershipId,
        status: { in: [TaskStatus.PENDENTE, TaskStatus.EM_ANDAMENTO, TaskStatus.ATRASADA] },
        OR: [
          { scheduled_at: { gte: start, lt: end } },
          { scheduled_at: null },
          { scheduled_at: { lt: start } },
        ],
      },
      include: {
        lead: {
          select: {
            id: true,
            company_name: true,
            domain: true,
            segment: true,
            company_size: true,
            icp_score: true,
            whatsapp: true,
            email: true,
            phone: true,
            state: true,
            city: true,
            status: true,
            contact_name: true,
          },
        },
      },
      orderBy: [
        { scheduled_at: { sort: 'asc', nulls: 'last' } },
        { created_at: 'asc' },
      ],
    });

    tasks.sort((a, b) => {
      const scoreA = a.lead?.icp_score ?? 0;
      const scoreB = b.lead?.icp_score ?? 0;
      return scoreB - scoreA;
    });

    res.json(tasks);
  }),
);

// POST /today
todayRouter.post(
  '/',
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const { lead_id, type, title, description, channel, scheduled_at } = req.body;

    const lead = await prisma.lead.findFirst({
      where: req.user!.role === 'SDR' 
        ? { id: lead_id, sdr_id: membershipId, tenant_id: tenantId }
        : { id: lead_id, tenant_id: tenantId },
    });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    const task = await prisma.task.create({
      data: {
        tenant_id: tenantId,
        membership_id: membershipId,
        lead_id,
        type,
        title,
        description,
        channel,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        status: TaskStatus.PENDENTE,
      },
      include: {
        lead: {
          select: {
            id: true,
            company_name: true,
            icp_score: true,
            status: true,
          },
        },
      },
    });

    res.status(201).json(task);
  }),
);

// PATCH /today/tasks/:id (Alias)
todayRouter.patch('/tasks/:id', validate(updateTaskSchema), asyncHandler(async (req, res) => {
  // Logic is same as PATCH /:id
  const tenantId = getTenantId(req);
  const membershipId = getMembershipId(req);
  const taskId = req.params.id as string;

  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenant_id: tenantId, membership_id: membershipId },
  });
  if (!existing) throw new AppError(404, 'Task não encontrada');

  const { status, outcome, scheduled_at, channel } = req.body;
  const data: any = {};
  if (status !== undefined) {
    data.status = status;
    if (status === TaskStatus.CONCLUIDA) data.completed_at = new Date();
  }
  if (outcome !== undefined) data.outcome = outcome;
  if (channel !== undefined) data.channel = channel;
  if (scheduled_at !== undefined) data.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;

  const task = await prisma.task.update({ where: { id: taskId }, data, include: { lead: { select: { id: true, company_name: true, icp_score: true, status: true } } } });
  if (task.status === TaskStatus.CONCLUIDA) {
    eventBus.publish(DomainEvent.TASK_COMPLETED, { tenant_id: tenantId, membership_id: membershipId, timestamp: new Date().toISOString(), data: { task_id: task.id, lead_id: task.lead_id!, type: task.type } });
  }
  res.json(task);
}));

// PATCH /today/:id
todayRouter.patch(
  '/:id',
  validate(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const taskId = req.params.id as string;

    const existing = await prisma.task.findFirst({
      where: { id: taskId, tenant_id: tenantId, membership_id: membershipId },
    });
    if (!existing) throw new AppError(404, 'Task não encontrada');

    const { status, outcome, scheduled_at, channel } = req.body;
    
    const data: any = {};
    if (status !== undefined) {
      data.status = status;
      if (status === TaskStatus.CONCLUIDA) {
        data.completed_at = new Date();
      }
    }
    if (outcome !== undefined) data.outcome = outcome;
    if (channel !== undefined) data.channel = channel;
    if (scheduled_at !== undefined) {
      data.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        lead: {
          select: {
            id: true,
            company_name: true,
            icp_score: true,
            status: true,
          },
        },
      },
    });

    if (task.status === TaskStatus.CONCLUIDA) {
      eventBus.publish(DomainEvent.TASK_COMPLETED, {
        tenant_id: tenantId,
        membership_id: membershipId,
        timestamp: new Date().toISOString(),
        data: {
          task_id: task.id,
          lead_id: task.lead_id!,
          type: task.type,
          cadence_enrollment_id: task.cadence_enrollment_id || undefined,
        }
      });
    }

    res.json(task);
  }),
);

// DELETE /today/:id
todayRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const taskId = req.params.id as string;

    const existing = await prisma.task.findFirst({
      where: { id: taskId, tenant_id: tenantId, membership_id: membershipId },
    });
    if (!existing) throw new AppError(404, 'Task não encontrada');

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.status(204).send();
  }),
);
