import { logger } from '../config/logger';
import { cadenceTaskExecutor } from '../modules/cadences/task.executor';
import { env } from '../config/env';

/**
 * Inicializa os workers de background para V2
 */
export async function initWorkers() {
  logger.info('[Workers] Initializing V2 Background Workers...');

  // 1. Worker de Cadências (Polling Simples)
  const interval = env.CADENCE_CHECK_INTERVAL_MS || 900000; // Default 15 min
  
  const processAllTasks = async () => {
    try {
      await cadenceTaskExecutor.processPendingTasks();
    } catch (err) {
      logger.error('[Workers] Error in CadenceTaskExecutor loop', err);
    }
  };

  // Executa imediatamente no boot
  processAllTasks();

  // Agenda recorrência
  const cadenceInterval = setInterval(processAllTasks, interval);

  logger.info(`[Workers] Cadence Polling active every ${interval}ms`);

  return {
    close: async () => {
      clearInterval(cadenceInterval);
      logger.info('[Workers] Background workers stopped.');
    }
  };
}
