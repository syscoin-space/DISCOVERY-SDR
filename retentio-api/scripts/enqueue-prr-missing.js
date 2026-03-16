require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');

(async () => {
  const prisma = new PrismaClient();
  try {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { prr_inputs: { is: null } },
          { prr_score: null },
        ],
      },
      select: { id: true },
    });

    console.log('Leads found needing PRR recalculation:', leads.length);
    if (leads.length === 0) return process.exit(0);

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const q = new Queue('prr-calculation', { connection: { url: redisUrl } });

    for (const l of leads) {
      await q.add('calculate', { leadId: l.id }, { jobId: `prr-${l.id}` });
      console.log('Enqueued', l.id);
    }

    await q.close();
    console.log('Done enqueuing');
  } catch (e) {
    console.error(e);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
