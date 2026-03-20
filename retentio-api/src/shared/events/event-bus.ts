import { EventEmitter } from 'events';
import { DomainEvent, DomainEventPayload } from './domain-events';
import { logger } from '../../config/logger';

class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  publish<T extends DomainEvent>(event: T, payload: any): void {
    logger.info(`[EventBus:Publish] ${event}`, { 
      tenant_id: payload.tenant_id,
      membership_id: payload.membership_id,
      event
    });
    this.emitter.emit(event, payload);
  }

  async publishAndWait<T extends DomainEvent>(event: T, payload: any): Promise<void> {
    logger.info(`[EventBus:PublishWait] ${event}`, { 
      tenant_id: payload.tenant_id,
      membership_id: payload.membership_id,
      event
    });
    
    const listeners = this.emitter.listeners(event);
    // Como cada listener no subscribe é um async (payload) => { await handler(payload) },
    // podemos capturar as promessas.
    // NOTA: EventEmitter.listeners retorna referências.
    // Mas wait, our 'async' wrapper is private inside 'subscribe'.
    // Alternativa: usar um array de promessas global pendente ou emitir evento e capturar.
    // Mais simples: EventEmitter não suporta nativamente await emit.
    // Vou disparar e usar o emit do próprio emitter mas aguardando.
    
    await Promise.all(listeners.map(async (listener: any) => {
      try {
        await listener(payload);
      } catch (err: any) {
        // Erros individuais não devem travar tudo, mas logamos
        logger.error(`[EventBus:PublishWait] Listener error`, { event, error: err.message || err });
      }
    }));
  }

  subscribe<T extends DomainEvent>(event: T, handler: (payload: any) => void | Promise<void>): void {
    logger.info(`[EventBus:Subscribe] Registering handler for ${event}`);
    this.emitter.on(event, async (payload) => {
      try {
        await handler(payload);
        logger.info(`[EventBus:Success] Handler for ${event} executed`, {
          tenant_id: payload.tenant_id,
          event
        });
      } catch (error: any) {
        logger.error(`[EventBus:Error] Handler for ${event} failed`, {
          tenant_id: payload.tenant_id,
          event,
          error: error.message || error
        });
      }
    });
  }
}

export const eventBus = new EventBus();
