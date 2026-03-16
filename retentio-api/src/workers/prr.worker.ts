import { Worker, Job } from 'bullmq';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { checkAndApplyBlocks } from '../modules/leads/block.service';
import { PrrTier } from '@prisma/client';

const redisUrl = new URL(env.REDIS_URL);
const connection: any = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379', 10),
};

if (redisUrl.password) connection.password = redisUrl.password;
else if (env.REDIS_PASSWORD) connection.password = env.REDIS_PASSWORD;

if (redisUrl.username) connection.username = redisUrl.username;
else if (env.REDIS_USERNAME) connection.username = env.REDIS_USERNAME;

export const prrWorker = new Worker(
  'prr-calculation',
  async (job: Job<{ leadId: string }>) => {
    const start = Date.now();
    const { leadId } = job.data;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { prr_inputs: true },
    });

    if (!lead || !lead.prr_inputs) {
      logger.warn(`Lead ${leadId} or prr_inputs not found for calculation`);
      return;
    }

    const inputs = lead.prr_inputs;
    const weights = await prisma.prrWeight.findMany();

    let score = 0;

    // A) base_size
    const baseSizeWeights = weights.filter(w => w.dimension === 'base_size');
    const leadBaseSize = inputs.base_size_estimated || 0;
    for (const w of baseSizeWeights) {
      const min = w.min_value ?? -Infinity;
      const max = w.max_value ?? Infinity;
      if (leadBaseSize >= min && leadBaseSize <= max) {
        score += w.weight;
        break;
      }
    }

    // B) recompra: SEM_RECOMPRA=0, TRIMESTRAL=10, MENSAL=20, SEMANAL=30
    // Usamos o campo recompra_cycle que adicionamos ao Lead (ou se estiver em inputs)
    // O usuário disse: "Busca campos do lead: ..., recompra_cycle, ..."
    const recompra = lead.recompra_cycle || 'SEM_RECOMPRA';
    const recompraScores: Record<string, number> = {
      SEM_RECOMPRA: 0,
      TRIMESTRAL: 10,
      MENSAL: 20,
      SEMANAL: 30,
    };
    score += recompraScores[recompra] || 0;

    // C) ticket: BAIXO=5, MEDIO=10, ALTO=20
    // O usuário não definiu as faixas de ticket no prompt, mas deu os scores.
    // Vamos assumir que existe um mapeamento ou campo que já categoriza isso.
    // Como o prompt diz "ticket: BAIXO=5, MEDIO=10, ALTO=20", vou assumir que existe uma lógica de faixa ou um campo.
    // Se prr_weights tiver faixas para ticket, usamos. Se não, usamos o valor bruto filtrado?
    // Vamos olhar se prr_weights tem dimensão 'ticket'.
    const ticketWeights = weights.filter(w => w.dimension === 'ticket');
    const leadTicket = inputs.avg_ticket_estimated || 0;
    if (ticketWeights.length > 0) {
      for (const w of ticketWeights) {
        const min = w.min_value ?? -Infinity;
        const max = w.max_value ?? Infinity;
        if (leadTicket >= min && leadTicket <= max) {
          score += w.weight;
          break;
        }
      }
    } else {
      // Fallback para valores fixos se for string (improvável dado o schema Float)
      // Mas o prompt sugere faixas fixas. Vamos aplicar 5, 10, 20 baseado em valores comuns se não houver weights.
      if (leadTicket < 100) score += 5;
      else if (leadTicket < 1000) score += 10;
      else score += 20;
    }

    // D) inatividade: <30%=0, 30-60%=10, >60%=15
    const inatividade = inputs.inactive_base_pct || 0;
    if (inatividade < 30) score += 0;
    else if (inatividade <= 60) score += 10;
    else score += 15;

    // E) integrability_score direto (já é 0–20)
    score += inputs.integrability_score || 0;

    // prr_score = soma das 5 dimensões (max 100)
    const finalScore = Math.min(score, 100);

    // prr_tier: >= 70 → "A" | >= 40 → "B" | < 40 → "C"
    let tier: PrrTier = PrrTier.C;
    if (finalScore >= 70) tier = PrrTier.A;
    else if (finalScore >= 40) tier = PrrTier.B;

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        prr_score: finalScore,
        prr_tier: tier,
      },
    });

    // Chama checkAndApplyBlocks(leadId)
    await checkAndApplyBlocks(leadId);

    const duration = Date.now() - start;
    logger.info(`PRR calculation completed: { leadId: "${leadId}", score: ${finalScore}, tier: "${tier}", ms: ${duration} }`);
  },
  { connection }
);

prrWorker.on('error', err => {
  logger.error('PRR Worker error', err);
});
