import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { registerDomainHandlers } from './modules/handlers';

// Initialize Domain Event Handlers
registerDomainHandlers();

// ── V1 Workers (Disabled for V2 Foundation) ──
// These will be rebuilt or refactored in Sprint 13 (Event Engine)
/*
import { startCadenceStepWorker } from './modules/cadences/cadence-step.worker';
import { startNotificationWorker } from './modules/notifications/notification.worker';

const cadenceWorker = startCadenceStepWorker();
let notificationWorkerInstance: Awaited<ReturnType<typeof startNotificationWorker>> | null = null;
startNotificationWorker().then((w) => {
  notificationWorkerInstance = w;
}).catch((err) => {
  logger.error('Failed to start notification worker:', err);
});
*/

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Retentio API V2 running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  // if (cadenceWorker) await cadenceWorker.close();
  // if (notificationWorkerInstance) await notificationWorkerInstance.close();
  
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
