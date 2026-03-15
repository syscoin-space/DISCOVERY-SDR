import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, roleGuard } from '../../middlewares';

export const dashboardRouter = Router();
dashboardRouter.use(authGuard);

// GET /dashboard/pipeline — counts por status (Gestor vê todos, SDR vê só os seus)
dashboardRouter.get(
  '/pipeline',
  asyncHandler(async (req, res) => {
    const where = req.user!.role === 'GESTOR' ? {} : { sdr_id: req.user!.sub };

    const raw = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const total = raw.reduce((acc: number, r: { _count: { id: number } }) => acc + r._count.id, 0);
    res.json({ pipeline: raw.map((r: { status: string; _count: { id: number } }) => ({ status: r.status, count: r._count.id })), total });
  }),
);

// GET /dashboard/prr-distribution
dashboardRouter.get(
  '/prr-distribution',
  asyncHandler(async (req, res) => {
    const where = req.user!.role === 'GESTOR' ? {} : { sdr_id: req.user!.sub };

    const raw = await prisma.lead.groupBy({
      by: ['prr_tier'],
      where: { ...where, prr_tier: { not: null } },
      _count: { id: true },
      _avg: { prr_score: true },
    });

    res.json(raw.map((r: { prr_tier: string | null; _count: { id: number }; _avg: { prr_score: number | null } }) => ({
      tier: r.prr_tier,
      count: r._count.id,
      avg_score: +(r._avg.prr_score ?? 0).toFixed(2),
    })));
  }),
);

// GET /dashboard/sdr-metrics — Gestor only
dashboardRouter.get(
  '/sdr-metrics',
  roleGuard('GESTOR'),
  asyncHandler(async (_req, res) => {
    const sdrs = await prisma.user.findMany({
      where: { role: 'SDR', active: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: { leads: true, handoffs_sent: true },
        },
      },
    });

    // Enrich with status breakdown per SDR
    const metrics = await Promise.all(sdrs.map(async (sdr: { id: string; name: string; _count: { leads: number; handoffs_sent: number } }) => {
      const statusBreakdown = await prisma.lead.groupBy({
        by: ['status'],
        where: { sdr_id: sdr.id },
        _count: { id: true },
      });

      return {
        sdr_id: sdr.id,
        name: sdr.name,
        total_leads: sdr._count.leads,
        total_handoffs: sdr._count.handoffs_sent,
        status_breakdown: Object.fromEntries(statusBreakdown.map((s: { status: string; _count: { id: number } }) => [s.status, s._count.id])),
      };
    }));

    res.json(metrics);
  }),
);

// GET /dashboard/cadence-performance
dashboardRouter.get(
  '/cadence-performance',
  asyncHandler(async (_req, res) => {
    const cadences = await prisma.cadence.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        _count: { select: { lead_cadences: true } },
      },
    });

    const enriched = await Promise.all(cadences.map(async (c: { id: string; name: string; _count: { lead_cadences: number } }) => {
      const stepStats = await prisma.leadCadenceStep.groupBy({
        by: ['status'],
        where: { cadence_step: { cadence_id: c.id } },
        _count: { id: true },
      });

      return {
        cadence_id: c.id,
        name: c.name,
        total_enrolled: c._count.lead_cadences,
        step_stats: Object.fromEntries(stepStats.map((s: { status: string; _count: { id: number } }) => [s.status, s._count.id])),
      };
    }));

    res.json(enriched);
  }),
);
