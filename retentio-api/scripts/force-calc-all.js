require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const weights = await prisma.prrWeight.findMany();
    const weightMap = new Map(weights.map(w => [w.dimension, w]));

    const leads = await prisma.lead.findMany({ include: { prr_inputs: true }, where: { prr_inputs: { isNot: null } } });
    console.log('Leads with prr_inputs to calculate:', leads.length);

    for (const lead of leads) {
      const inputs = lead.prr_inputs;
      if (!inputs) continue;

      const dims = [
        { key: 'base_size', value: inputs.base_size_estimated },
        { key: 'recompra_cycle', value: inputs.recompra_cycle_days },
        { key: 'avg_ticket', value: inputs.avg_ticket_estimated },
        { key: 'inactive_base', value: inputs.inactive_base_pct },
        { key: 'integrability', value: inputs.integrability_score },
      ];

      let totalScore = 0;
      const breakdown = {};

      for (const dim of dims) {
        const w = weightMap.get(dim.key);
        if (!w || dim.value == null) continue;
        const min = w.min_value ?? 0;
        const max = w.max_value ?? 1;
        const range = max - min || 1;
        const raw = dim.value;
        let normalized;
        if (dim.key === 'recompra_cycle') normalized = Math.max(0, Math.min(10, ((max - raw) / range) * 10));
        else normalized = Math.max(0, Math.min(10, ((raw - min) / range) * 10));
        const weighted = normalized * w.weight;
        totalScore += weighted;
        breakdown[dim.key] = { raw, normalized: +normalized.toFixed(2), weighted: +weighted.toFixed(3) };
      }

      const score = +totalScore.toFixed(2);
      const tier = score >= 7 ? 'A' : score >= 4 ? 'B' : 'C';

      await prisma.lead.update({ where: { id: lead.id }, data: { prr_score: score, prr_tier: tier } });
      console.log('Calculated', lead.id, score, tier);
    }

    console.log('Done');
  } catch (e) {
    console.error(e);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
