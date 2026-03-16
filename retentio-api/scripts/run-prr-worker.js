require('dotenv').config();
const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function calculate(leadId) {
  const [lead, inputs, weights] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.prrInputs.findUnique({ where: { lead_id: leadId } }),
    prisma.prrWeight.findMany(),
  ]);

  if (!lead) throw new Error('Lead not found');
  if (!inputs) throw new Error('PRR inputs not found');

  const weightMap = new Map(weights.map(w => [w.dimension, w]));
  const breakdown = {};
  let totalScore = 0;

  const dims = [
    { key: 'base_size', value: inputs.base_size_estimated },
    { key: 'recompra_cycle', value: inputs.recompra_cycle_days },
    { key: 'avg_ticket', value: inputs.avg_ticket_estimated },
    { key: 'inactive_base', value: inputs.inactive_base_pct },
    { key: 'integrability', value: inputs.integrability_score },
  ];

  for (const dim of dims) {
    const w = weightMap.get(dim.key);
    if (!w || dim.value == null) continue;

    const min = w.min_value ?? 0;
    const max = w.max_value ?? 1;
    const range = max - min || 1;

    const raw = dim.value;
    let normalized;
    if (dim.key === 'recompra_cycle') {
      normalized = Math.max(0, Math.min(10, ((max - raw) / range) * 10));
    } else {
      normalized = Math.max(0, Math.min(10, ((raw - min) / range) * 10));
    }

    const weighted = normalized * w.weight;
    totalScore += weighted;
    breakdown[dim.key] = { raw, normalized: +normalized.toFixed(2), weighted: +weighted.toFixed(3) };
  }

  const score = +totalScore.toFixed(2);
  const tier = score >= 7 ? 'A' : score >= 4 ? 'B' : 'C';

  await prisma.lead.update({ where: { id: leadId }, data: { prr_score: score, prr_tier: tier } });
  return { score, tier, breakdown };
}

const worker = new Worker('prr-calculation', async (job) => {
  console.log('Worker received job', job.id, job.data);
  const res = await calculate(job.data.leadId);
  console.log('Calculated:', res);
  return res;
}, { connection: { url: redisUrl } });

worker.on('completed', (job) => console.log('Job completed', job.id));
worker.on('failed', (job, err) => console.error('Job failed', job?.id, err));
worker.on('error', (err) => console.error('Worker error', err));

console.log('PRR test worker started, listening...');
process.stdin.resume();
