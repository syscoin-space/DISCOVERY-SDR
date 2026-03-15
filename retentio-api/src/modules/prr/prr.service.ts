import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/types';
import { logger } from '../../config/logger';

export interface PrrResult {
  score: number;
  tier: 'A' | 'B' | 'C';
  breakdown: Record<string, { raw: number; normalized: number; weighted: number }>;
}

export class PrrService {
  /**
   * Calcula PRR score para um lead.
   * Normaliza cada dimensão [0-10] e aplica peso de PrrWeight.
   */
  async calculate(leadId: string): Promise<PrrResult> {
    const [lead, inputs, weights] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.prrInputs.findUnique({ where: { lead_id: leadId } }),
      prisma.prrWeight.findMany(),
    ]);

    if (!lead) throw new AppError(404, 'Lead não encontrado');
    if (!inputs) throw new AppError(422, 'PRR inputs não preenchidos para este lead');

    const weightMap = new Map(weights.map(w => [w.dimension, w]));
    const breakdown: PrrResult['breakdown'] = {};
    let totalScore = 0;

    // ── Normalização por dimensão ──
    const dims: { key: string; value: number | null }[] = [
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

      // Para recompra_cycle: menor é melhor (inverter)
      const raw = dim.value;
      let normalized: number;
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
    const tier = score >= 7 ? 'A' as const : score >= 4 ? 'B' as const : 'C' as const;

    // Persiste resultado
    await prisma.lead.update({
      where: { id: leadId },
      data: { prr_score: score, prr_tier: tier },
    });

    logger.info(`PRR calculated for lead ${leadId}: ${score} (${tier})`);
    return { score, tier, breakdown };
  }

  async upsertInputs(leadId: string, data: {
    base_size_estimated?: number;
    recompra_cycle_days?: number;
    avg_ticket_estimated?: number;
    inactive_base_pct?: number;
    integrability_score?: number;
  }) {
    return prisma.prrInputs.upsert({
      where: { lead_id: leadId },
      create: { lead_id: leadId, ...data },
      update: data,
    });
  }

  async getWeights() {
    return prisma.prrWeight.findMany({ orderBy: { dimension: 'asc' } });
  }

  async updateWeight(dimension: string, weight: number) {
    return prisma.prrWeight.update({
      where: { dimension },
      data: { weight },
    });
  }
}

export const prrService = new PrrService();
