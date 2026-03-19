import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard } from '../../middlewares';
import { AppError } from '../../shared/types';

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
  canal: z.string().optional(),
  proximo_contato: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  status: z.string().optional(),
  resultado: z.string().optional(),
  proximo_contato: z.string().datetime().nullable().optional(),
  canal: z.string().nullable().optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET /today/summary — contadores (must be before /:id)
todayRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const sdrId = req.user!.sub;
    const { start, end } = todayRange();

    const tasks = await prisma.dailyTask.groupBy({
      by: ['status'],
      where: {
        sdr_id: sdrId,
        OR: [
          { date: { gte: start, lt: end }, proximo_contato: null },
          { proximo_contato: { gte: start, lt: end } },
        ],
      },
      _count: true,
    });

    const counts: Record<string, number> = {};
    let total = 0;
    for (const group of tasks) {
      counts[group.status] = group._count;
      total += group._count;
    }

    const pendenteAgg = counts.PENDENTE ?? 0;
    const feitoAgg = total - pendenteAgg;

    res.json({
      total,
      pendente: pendenteAgg,
      atendeu: feitoAgg, // Mapeando para o campo que o front já usa como "feitos" para evitar quebra imediata
      concluidos: feitoAgg,
      detalhado: {
        pendente: counts.PENDENTE ?? 0,
        atendeu: counts.ATENDEU ?? 0,
        nao_atendeu: counts.NAO_ATENDEU ?? 0,
        reuniao_agendada: counts.REUNIAO_AGENDADA ?? 0,
        mensagem_enviada: counts.MENSAGEM_ENVIADA ?? 0,
        sem_interesse: counts.SEM_INTERESSE ?? 0,
        ligar_depois: counts.LIGAR_DEPOIS ?? 0,
        pessoa_errada: counts.PESSOA_ERRADA ?? 0,
        numero_errado: counts.NUMERO_ERRADO ?? 0,
      }
    });
  }),
);

// GET /today — tasks do dia
todayRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const sdrId = req.user!.sub;
    const { start, end } = todayRange();

    const tasks = await prisma.dailyTask.findMany({
      where: {
        sdr_id: sdrId,
        OR: [
          { date: { gte: start, lt: end }, proximo_contato: null },
          { proximo_contato: { gte: start, lt: end } },
        ],
      },
      include: {
        lead: {
          select: {
            id: true,
            company_name: true,
            niche: true,
            prr_score: true,
            prr_tier: true,
            icp_score: true,
            whatsapp: true,
            email: true,
            phone: true,
            ecommerce_platform: true,
            state: true,
            city: true,
            status: true,
            contact_name: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDENTE first
        { created_at: 'asc' },
      ],
    });

    // Sort: tier A first, then by prr_score desc
    const FINAL_STATUSES = ['SEM_INTERESSE', 'PESSOA_ERRADA', 'NUMERO_ERRADO'];
    const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
    tasks.sort((a, b) => {
      const statusPriority = (s: string) => {
        if (s === 'PENDENTE' || s === 'LIGAR_DEPOIS') return 0;
        if (FINAL_STATUSES.includes(s)) return 2;
        return 1;
      };
      const aDone = statusPriority(a.status);
      const bDone = statusPriority(b.status);
      if (aDone !== bDone) return aDone - bDone;

      const aTier = tierOrder[a.lead.prr_tier ?? 'C'] ?? 2;
      const bTier = tierOrder[b.lead.prr_tier ?? 'C'] ?? 2;
      if (aTier !== bTier) return aTier - bTier;

      return (b.lead.prr_score ?? 0) - (a.lead.prr_score ?? 0);
    });

    res.json(tasks);
  }),
);

// POST /today — adicionar lead à fila
todayRouter.post(
  '/',
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const sdrId = req.user!.sub;
    const { lead_id, canal, proximo_contato } = req.body;

    // Verify lead belongs to SDR
    const lead = await prisma.lead.findFirst({
      where: { id: lead_id, sdr_id: sdrId },
    });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    const { start } = todayRange();

    const task = await prisma.dailyTask.upsert({
      where: {
        lead_id_sdr_id_date: { lead_id, sdr_id: sdrId, date: start },
      },
      update: {},
      create: {
        lead_id,
        sdr_id: sdrId,
        date: start,
        canal: canal ?? null,
        proximo_contato: proximo_contato ? new Date(proximo_contato) : null,
      },
      include: {
        lead: {
          select: {
            id: true,
            company_name: true,
            niche: true,
            prr_score: true,
            prr_tier: true,
            icp_score: true,
            status: true,
          },
        },
      },
    });

    res.status(201).json(task);
  }),
);

// PATCH /today/:id — atualizar status/resultado
todayRouter.patch(
  '/:id',
  validate(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const sdrId = req.user!.sub;

    const existing = await prisma.dailyTask.findFirst({
      where: { id: req.params.id as string, sdr_id: sdrId },
    });
    if (!existing) throw new AppError(404, 'Task não encontrada');

    const data: Record<string, unknown> = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.resultado !== undefined) data.resultado = req.body.resultado;
    if (req.body.canal !== undefined) data.canal = req.body.canal;
    if (req.body.proximo_contato !== undefined) {
      data.proximo_contato = req.body.proximo_contato
        ? new Date(req.body.proximo_contato)
        : null;
    }

    const task = await prisma.dailyTask.update({
      where: { id: req.params.id as string },
      data,
      include: {
        lead: {
          select: {
            id: true,
            company_name: true,
            niche: true,
            prr_score: true,
            prr_tier: true,
            icp_score: true,
            status: true,
          },
        },
      },
    });

    res.json(task);
  }),
);

// DELETE /today/:id — remover da fila
todayRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const sdrId = req.user!.sub;

    const existing = await prisma.dailyTask.findFirst({
      where: { id: req.params.id as string, sdr_id: sdrId },
    });
    if (!existing) throw new AppError(404, 'Task não encontrada');

    await prisma.dailyTask.delete({
      where: { id: req.params.id as string },
    });

    res.status(204).send();
  }),
);
