require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');

(async () => {
  const prisma = new PrismaClient();
  try {
    const leads = await prisma.lead.findMany({
      where: { prr_inputs: { is: null } },
      select: { id: true, estimated_base_size: true, avg_ticket_estimated: true, recompra_cycle: true },
    });

    console.log('Leads without prr_inputs:', leads.length);
    if (leads.length === 0) return process.exit(0);

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const q = new Queue('prr-calculation', { connection: { url: redisUrl } });

    for (const l of leads) {
      const defaultInputs = {
        base_size_estimated: l.estimated_base_size ?? 1000,
        recompra_cycle_days: l.recompra_cycle ? parseInt(String(l.recompra_cycle), 10) || 90 : 90,
        avg_ticket_estimated: l.avg_ticket_estimated ?? 100,
        inactive_base_pct: 0.3,
        integrability_score: 3,
      };

      await prisma.prrInputs.create({ data: { lead_id: l.id, ...defaultInputs } });
      await q.add('calculate', { leadId: l.id }, { jobId: `prr-${l.id}` });
      console.log('Populated and enqueued', l.id);
    }

    await q.close();
    console.log('Done');
  } catch (e) {
    console.error(e);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
