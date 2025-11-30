type EventHandler<T = any> = (data: T) => void;

class EventBus {
  private listeners: Record<string, EventHandler[]> = {};

  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(h => h !== handler);
  }

  emit<T = any>(event: string, data?: T): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(handler => handler(data));
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  TIER_LIMIT_EXCEEDED: 'TIER_LIMIT_EXCEEDED',
  FEATURE_LOCKED: 'FEATURE_LOCKED'
} as const;
