import { prrWorker } from './prr.worker';
import { logger } from '../config/logger';

export async function initWorkers() {
  logger.info('Initializing workers...');
  
  // O worker já é inicializado ao ser importado (se ele exportar a instância)
  // Mas podemos garantir que ele esteja pronto ou registrar handlers globais aqui.
  
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Closing workers...`);
    await prrWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
