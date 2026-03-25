import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { registerDomainHandlers } from './modules/handlers';
import { initWorkers } from './workers';

// Initialize Domain Event Handlers
registerDomainHandlers();

// Initialize Background Workers (V2)
let workersInstance: any = null;
initWorkers()
  .then(w => {
    workersInstance = w;
  })
  .catch(err => {
    logger.error('[Server] Failed to initialize workers:', err);
  });

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Retentio API V2 running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (workersInstance) await workersInstance.close();
  
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
