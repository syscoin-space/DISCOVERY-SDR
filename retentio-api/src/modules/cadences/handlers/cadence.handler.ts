import { eventBus } from '../../../shared/events/event-bus';
import { DomainEvent, TaskCompletedPayload } from '../../../shared/events/domain-events';
import { CadenceService } from '../cadence.service';
import { logger } from '../../../config/logger';

export class CadenceHandler {
  private cadenceService: CadenceService;

  constructor() {
    this.cadenceService = new CadenceService();
  }

  public register(): void {
    eventBus.subscribe(DomainEvent.TASK_COMPLETED, this.handleTaskCompleted.bind(this));
  }

  private async handleTaskCompleted(payload: TaskCompletedPayload): Promise<void> {
    const { tenant_id, data } = payload;
    const { task_id, type } = data;

    // Only advance if it's a cadence step
    if (type !== 'CADENCE_STEP') return;

    try {
      logger.info(`[CadenceHandler] Advancing cadence for task ${task_id}`, { tenant_id, task_id });
      await this.cadenceService.handleTaskCompletion(task_id, tenant_id);
    } catch (error: any) {
      logger.error(`[CadenceHandler] Error advancing cadence for task ${task_id}`, { 
        tenant_id, 
        task_id,
        error: error.message || error 
      });
    }
  }
}

export const cadenceHandler = new CadenceHandler();
