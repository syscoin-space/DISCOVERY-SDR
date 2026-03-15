import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate } from '../../middlewares';
import { AppError } from '../../shared/types';

export const gestorRouter = Router();

// ─── GET /gestor/dashboard ───
gestorRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday

    // All SDRs
    const sdrs = await prisma.user.findMany({
      where: { role: 'SDR', active: true },
      select: { id: true, name: true, email: true },
    });

    const sdrIds = sdrs.map((s) => s.id);

    // Today's tasks
    const todayTasks = await prisma.dailyTask.findMany({
      where: {
        sdr_id: { in: sdrIds },
        date: startOfDay,
      },
    });

    const totalTasks = todayTasks.length;
    const completedTasks = todayTasks.filter(
      (t) => ['CONCLUIDO', 'SEM_INTERESSE', 'NUMERO_ERRADO'].includes(t.status),
    ).length;
    const pendingTasks = todayTasks.filter((t) => t.status === 'PENDENTE').length;

    // This week's meetings
    const weekMeetings = await prisma.dailyTask.count({
      where: {
        sdr_id: { in: sdrIds },
        date: { gte: startOfWeek },
        resultado: 'REUNIAO_AGENDADA',
      },
    });

    // This week's handoffs
    const weekHandoffs = await prisma.handoffBriefing.count({
      where: {
        sdr_id: { in: sdrIds },
        created_at: { gte: startOfWeek },
      },
    });

    // Lead funnel
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: { sdr_id: { in: sdrIds } },
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
    const sdrSummaries = sdrs.map((sdr) => {
      const tasks = todayTasks.filter((t) => t.sdr_id === sdr.id);
      const done = tasks.filter(
        (t) => ['CONCLUIDO', 'SEM_INTERESSE', 'NUMERO_ERRADO'].includes(t.status),
      ).length;
      return {
        id: sdr.id,
        name: sdr.name,
        total: tasks.length,
        done,
        pending: tasks.filter((t) => t.status === 'PENDENTE').length,
        completion_pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      };
    });

    // Alerts: SDRs with 0 tasks today or < 30% completion after noon
    const isAfterNoon = now.getHours() >= 12;
    const alerts: Array<{ sdr_name: string; type: string; message: string }> = [];

    for (const s of sdrSummaries) {
      if (s.total === 0) {
        alerts.push({ sdr_name: s.name, type: 'sem_tarefas', message: `${s.name} não tem tarefas hoje` });
      } else if (isAfterNoon && s.completion_pct < 30) {
        alerts.push({
          sdr_name: s.name,
          type: 'baixa_conclusao',
          message: `${s.name} com apenas ${s.completion_pct}% concluído`,
        });
      }
    }

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
      alerts,
    });
  }),
);

// ─── GET /gestor/sdrs ───
gestorRouter.get(
  '/sdrs',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sdrs = await prisma.user.findMany({
      where: { role: 'SDR', active: true },
      select: { id: true, name: true, email: true, created_at: true },
    });

    const results = await Promise.all(
      sdrs.map(async (sdr) => {
        const [totalLeads, todayTasks, weekMeetings, monthHandoffs, activeCadences] =
          await Promise.all([
            prisma.lead.count({ where: { sdr_id: sdr.id } }),
            prisma.dailyTask.findMany({
              where: { sdr_id: sdr.id, date: startOfDay },
            }),
            prisma.dailyTask.count({
              where: { sdr_id: sdr.id, date: { gte: startOfWeek }, resultado: 'REUNIAO_AGENDADA' },
            }),
            prisma.handoffBriefing.count({
              where: { sdr_id: sdr.id, created_at: { gte: startOfMonth } },
            }),
            prisma.leadCadence.count({
              where: {
                lead: { sdr_id: sdr.id },
                status: 'active',
              },
            }),
          ]);

        const todayDone = todayTasks.filter(
          (t) => ['CONCLUIDO', 'SEM_INTERESSE', 'NUMERO_ERRADO'].includes(t.status),
        ).length;

        return {
          id: sdr.id,
          name: sdr.name,
          email: sdr.email,
          total_leads: totalLeads,
          today_tasks: todayTasks.length,
          today_done: todayDone,
          today_completion_pct:
            todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0,
          week_meetings: weekMeetings,
          month_handoffs: monthHandoffs,
          active_cadences: activeCadences,
        };
      }),
    );

    res.json(results);
  }),
);

// ─── METAS CRUD ───

const createMetaSchema = z.object({
  sdr_id: z.string().uuid().nullable().optional(),
  tipo: z.string().min(1),
  valor: z.number().int().positive(),
  periodo: z.string().min(1),
});

const updateMetaSchema = z.object({
  valor: z.number().int().positive().optional(),
  ativo: z.boolean().optional(),
});

// GET /gestor/metas
gestorRouter.get(
  '/metas',
  asyncHandler(async (_req, res) => {
    const metas = await prisma.meta.findMany({
      include: { sdr: { select: { id: true, name: true } } },
      orderBy: [{ tipo: 'asc' }, { created_at: 'desc' }],
    });
    res.json(metas);
  }),
);

// POST /gestor/metas
gestorRouter.post(
  '/metas',
  validate(createMetaSchema),
  asyncHandler(async (req, res) => {
    const meta = await prisma.meta.create({
      data: req.body,
      include: { sdr: { select: { id: true, name: true } } },
    });
    res.status(201).json(meta);
  }),
);

// PATCH /gestor/metas/:id
gestorRouter.patch(
  '/metas/:id',
  validate(updateMetaSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.meta.findUnique({ where: { id: req.params.id as string } });
    if (!existing) throw new AppError(404, 'Meta não encontrada');

    const meta = await prisma.meta.update({
      where: { id: req.params.id as string },
      data: req.body,
      include: { sdr: { select: { id: true, name: true } } },
    });
    res.json(meta);
  }),
);

// DELETE /gestor/metas/:id
gestorRouter.delete(
  '/metas/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.meta.findUnique({ where: { id: req.params.id as string } });
    if (!existing) throw new AppError(404, 'Meta não encontrada');

    await prisma.meta.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  }),
);
