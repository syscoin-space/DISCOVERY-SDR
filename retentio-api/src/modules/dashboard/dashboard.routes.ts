import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, roleGuard, getTenantId, getMembershipId } from '../../middlewares';
import { LeadStatus, Role, TaskStatus } from '@prisma/client';

export const dashboardRouter = Router();
dashboardRouter.use(authGuard);

// GET /dashboard/pipeline — counts por status
dashboardRouter.get(
  '/pipeline',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    
    // SDR checks only their own. Manager/Owner sees everything for the tenant.
    const where: any = { tenant_id: tenantId };
    if (req.user!.role === 'SDR') {
      where.sdr_id = membershipId;
    }

    const raw = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const pipeline = Object.values(LeadStatus).reduce((acc: any, s) => {
      acc[s] = 0;
      return acc;
    }, {});

    raw.forEach(r => {
      pipeline[r.status] = r._count.id;
    });

    res.json(pipeline);
  }),
);

// GET /dashboard/stats — KPI metrics
dashboardRouter.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const isGestor = req.user!.role !== 'SDR';
    
    const where: any = { tenant_id: tenantId };
    if (!isGestor) {
      where.sdr_id = membershipId;
    }

    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() || 7) + 1); // Monday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLeads, leadsHot, tasksDone, handoffs] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ 
        where: { ...where, icp_score: { gte: 8 } } 
      }),
      prisma.task.count({
        where: {
          tenant_id: tenantId,
          membership_id: isGestor ? undefined : membershipId,
          completed_at: { gte: startOfWeek },
          status: TaskStatus.CONCLUIDA,
        },
      }),
      prisma.handoffBriefing.count({
        where: {
          lead: { tenant_id: tenantId },
          sdr_id: isGestor ? undefined : membershipId,
          created_at: { gte: startOfMonth },
        },
      }),
    ]);

    res.json({
      total_leads: totalLeads,
      leads_hot: leadsHot, // Score 8+
      activities_this_week: tasksDone,
      handoffs_this_month: handoffs,
    });
  }),
);

// GET /dashboard/sdr-metrics — Managers/Owners only
dashboardRouter.get(
  '/sdr-metrics',
  roleGuard('MANAGER' as any, 'OWNER' as any),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const sdrMemberships = await prisma.membership.findMany({
      where: { tenant_id: tenantId, role: Role.SDR, active: true },
      include: {
        user: { select: { name: true } },
        _count: {
          select: { assigned_leads: true, handoffs_sent: true, tasks: { where: { status: TaskStatus.CONCLUIDA } } },
        },
      },
    });

    const metrics = await Promise.all(sdrMemberships.map(async (m) => {
      const statusBreakdown = await prisma.lead.groupBy({
        by: ['status'],
        where: { sdr_id: m.id, tenant_id: tenantId },
        _count: { id: true },
      });

      return {
        membership_id: m.id,
        name: m.user.name,
        total_leads: m._count.assigned_leads,
        total_handoffs: m._count.handoffs_sent,
        total_tasks_completed: m._count.tasks,
        status_breakdown: Object.fromEntries(statusBreakdown.map(s => [s.status, s._count.id])),
      };
    }));

    res.json(metrics);
  }),
);
