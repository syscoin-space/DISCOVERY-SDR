require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

(async function main(){
  const prisma = new PrismaClient();
  try {
    // Try to find existing prr_inputs (prefer entries with values)
    let inputs = await prisma.prrInputs.findFirst({ where: { base_size_estimated: { not: null } }, include: { lead: true } });
    if (!inputs) inputs = await prisma.prrInputs.findFirst({ include: { lead: true } });
    let leadId;
    if (inputs) {
      leadId = inputs.lead_id;
      console.log('Found existing prr_inputs for lead', leadId);
    } else {
      // find any user to assign as sdr
      const user = await prisma.user.findFirst();
      if (!user) {
        console.error('No users found in DB. Create a user first.');
        process.exit(2);
      }
      // create a test lead
      const lead = await prisma.lead.create({ data: { sdr_id: user.id, company_name: 'PRR Test Company' } });
      leadId = lead.id;
      // create prr_inputs with sample values
      inputs = await prisma.prrInputs.create({ data: {
        lead_id: leadId,
        base_size_estimated: 500,
        recompra_cycle_days: 30,
        avg_ticket_estimated: 200,
        inactive_base_pct: 20,
        integrability_score: 4,
      }});
      console.log('Created test lead and prr_inputs for lead', leadId);
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    const prrInputs = await prisma.prrInputs.findUnique({ where: { lead_id: leadId } });
    const weights = await prisma.prrWeight.findMany();

    if (!lead) throw new Error('Lead not found');
    if (!prrInputs) throw new Error('PRR inputs not found');

    const weightMap = new Map(weights.map(w => [w.dimension, w]));
    const breakdown = {};
    let totalScore = 0;

    const dims = [
      { key: 'base_size', value: prrInputs.base_size_estimated },
      { key: 'recompra_cycle', value: prrInputs.recompra_cycle_days },
      { key: 'avg_ticket', value: prrInputs.avg_ticket_estimated },
      { key: 'inactive_base', value: prrInputs.inactive_base_pct },
      { key: 'integrability', value: prrInputs.integrability_score },
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

    console.log('PRR result for lead', leadId, { score, tier, breakdown });
    process.exit(0);
  } catch (err) {
    console.error('Error running PRR script', err);
    process.exit(2);
  }
})();
