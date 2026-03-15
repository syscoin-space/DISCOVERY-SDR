import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { startCadenceStepWorker } from './modules/cadences/cadence-step.worker';
import { prrWorker } from './workers/prr.worker';

// ── Inicializa BullMQ Workers ──
const cadenceWorker = startCadenceStepWorker();
logger.info('Cadence step worker started');
// prrWorker já está rodando via import
logger.info('PRR worker started');

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Retentio API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown — fecha worker antes do processo morrer
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  await cadenceWorker.close();
  await prrWorker.close();
  logger.info('All workers closed');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', err);
});
