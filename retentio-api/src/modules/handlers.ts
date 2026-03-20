import { cadenceHandler } from './cadences/handlers/cadence.handler';
import { notificationHandler } from './notifications/handlers/notification.handler';
import { discoveryHandler } from './leads/handlers/discovery.handler';
import { aiHandler } from './ai/handlers/ai.handler';

export function registerDomainHandlers(): void {
  console.log('[Handlers] Registering V2 Domain Event Handlers...');
  
  cadenceHandler.register();
  notificationHandler.register();
  discoveryHandler.register();
  aiHandler.register();
  
  console.log('[Handlers] All handlers registered.');
}
