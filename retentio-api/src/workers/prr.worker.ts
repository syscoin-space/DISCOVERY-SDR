import { Worker, Job } from 'bullmq';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { checkAndApplyBlocks } from '../modules/leads/block.service';
import { prrService } from '../modules/prr/prr.service';

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

    // Ensure prr inputs exist before trying to calculate
    const inputs = await prisma.prrInputs.findUnique({ where: { lead_id: leadId } });
    if (!inputs) {
      logger.warn(`PRR inputs missing for lead ${leadId} — marking job as failed`);
      // Throw to mark the job as failed and keep trace in Redis
      throw new Error('PRR inputs missing');
    }

    try {
      const result = await prrService.calculate(leadId);
      await checkAndApplyBlocks(leadId);
      const duration = Date.now() - start;
      logger.info(`PRR worker calculated: { leadId: "${leadId}", score: ${result.score}, tier: "${result.tier}", ms: ${duration} }`);
    } catch (err) {
      logger.error(`PRR worker failed for lead ${leadId}`, err);
      throw err;
    }
  },
  { connection }
);

prrWorker.on('error', err => {
  logger.error('PRR Worker error', err);
});
