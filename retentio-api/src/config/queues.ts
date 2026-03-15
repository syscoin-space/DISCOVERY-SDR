import { Queue } from 'bullmq';
import { env } from './env';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port, 10),
};

export const prrQueue = new Queue('prr-calculation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export async function enqueuePRRRecalculation(leadId: string) {
  await prrQueue.add('calculate', { leadId }, {
    jobId: `prr-${leadId}`, // Evita duplicatas se vários inputs mudarem rápido
    removeOnComplete: true,
  });
}
