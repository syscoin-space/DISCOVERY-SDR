import { Queue } from 'bullmq';
import { env } from './env';

const redisUrl = new URL(env.REDIS_URL);
const connection: any = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379', 10),
};

if (redisUrl.password) connection.password = redisUrl.password;
else if (env.REDIS_PASSWORD) connection.password = env.REDIS_PASSWORD;

if (redisUrl.username) connection.username = redisUrl.username;
else if (env.REDIS_USERNAME) connection.username = env.REDIS_USERNAME;

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
