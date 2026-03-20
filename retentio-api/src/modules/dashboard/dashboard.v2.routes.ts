import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, getTenantId, getMembershipId } from '../../middlewares';
import { LeadStatus, TaskStatus } from '@prisma/client';

export const dashboardV2Router = Router();
dashboardV2Router.use(authGuard);

dashboardV2Router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const isGestor = req.user!.role !== 'SDR';

    // Base filters: se SDR, vê apenas o dele. Se Manager/Owner, vê geral do Tenant.
    const leadWhere: any = { tenant_id: tenantId };
    const taskWhere: any = { tenant_id: tenantId };
    const touchpointWhere: any = { lead: { tenant_id: tenantId } };
    const auditWhere: any = { tenant_id: tenantId, entity_type: 'Lead' };
    const handoffWhere: any = { lead: { tenant_id: tenantId } };

    if (!isGestor) {
      leadWhere.sdr_id = membershipId;
      taskWhere.membership_id = membershipId;
      touchpointWhere.membership_id = membershipId;
      auditWhere.user_id = membershipId;
      handoffWhere.sdr_id = membershipId;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── 1. Operational Metrics ──
    const [pipelineRaw, totalTasks, completedTasks, recentHandoffs, qualifiedLeadsCount] = await Promise.all([
      // Pipeline distribution
      prisma.lead.groupBy({ by: ['status'], where: leadWhere, _count: { id: true } }),
      // Tasks scope
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: TaskStatus.CONCLUIDA } }),
      // Handoffs this month
      prisma.handoffBriefing.count({ where: { ...handoffWhere, created_at: { gte: startOfMonth } } }),
      // Qualified + Prospeccao
      prisma.lead.count({ where: { ...leadWhere, status: { in: [LeadStatus.QUALIFICADO, LeadStatus.PROSPECCAO] } } })
    ]);

    const pipelineCounts = Object.values(LeadStatus).reduce((acc: any, s) => {
      acc[s] = 0;
      return acc;
    }, {});
    let totalLeads = 0;
    pipelineRaw.forEach(r => {
      pipelineCounts[r.status] = r._count.id;
      totalLeads += r._count.id;
    });

    const conversionRate = totalLeads > 0 ? (qualifiedLeadsCount / totalLeads) * 100 : 0;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // ── 2. Discovery Metrics ──
    const [leadsWithDMName, outcomesRaw] = await Promise.all([
      prisma.lead.count({ where: { ...leadWhere, NOT: [{ dm_name: null }, { dm_name: '' }] } }),
      prisma.touchpoint.groupBy({ by: ['outcome'], where: touchpointWhere, _count: { id: true } })
    ]);

    const objOutcomes: Record<string, number> = {};
    outcomesRaw.forEach(o => {
      if (o.outcome) objOutcomes[o.outcome] = o._count.id;
    });
    const discoveryCompletionRate = totalLeads > 0 ? (leadsWithDMName / totalLeads) * 100 : 0;

    // ── 3. AI / HIL Metrics ──
    // Filtrar actions de aceitação e rejeição de IA
    const aiLogs = await prisma.auditLog.findMany({
      where: {
        ...auditWhere,
        action: { in: ['AI_SUGGESTION_ACCEPTED', 'AI_SUGGESTION_REJECTED'] }
      },
      select: { action: true, new_value: true }
    });

    let aiAccepted = 0;
    let aiRejected = 0;
    let aiEdited = 0;

    aiLogs.forEach(log => {
      if (log.action === 'AI_SUGGESTION_ACCEPTED') {
        const payload = log.new_value as any;
        if (payload?.is_edited_by_human) {
          aiEdited++;
        } else {
          aiAccepted++;
        }
      } else if (log.action === 'AI_SUGGESTION_REJECTED') {
        aiRejected++;
      }
    });

    const aiTotalInteractions = aiAccepted + aiEdited + aiRejected;

    res.json({
      operational: {
        total_leads: totalLeads,
        qualified_leads: qualifiedLeadsCount,
        pipeline_distribution: pipelineCounts,
        conversion_rate: conversionRate,
        recent_handoffs: recentHandoffs,
        task_completion_rate: taskCompletionRate
      },
      discovery: {
        leads_with_dm: leadsWithDMName,
        discovery_completion_rate: discoveryCompletionRate,
        outcomes_distribution: objOutcomes
      },
      ai_hil: {
        total_interactions: aiTotalInteractions,
        accepted_clean: aiAccepted,
        edited_then_accepted: aiEdited,
        rejected: aiRejected,
        adoption_rate: aiTotalInteractions > 0 ? ((aiAccepted + aiEdited) / aiTotalInteractions) * 100 : 0
      }
    });
  })
);
