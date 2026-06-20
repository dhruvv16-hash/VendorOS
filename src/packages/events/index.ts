import { EventEmitter } from 'events';

export type EventType = 
  | 'ORDER_CREATED' 
  | 'ORDER_STATUS_CHANGED' 
  | 'INVENTORY_LOW' 
  | 'PAYMENT_RECEIVED'
  | 'LOYALTY_UPDATED'
  | 'AUDIT_LOGGED';

export interface EventPayloads {
  ORDER_CREATED: {
    orderId: string;
    storeId: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    items: Array<{ name: string; qty: number; price: number }>;
    total: number;
    subtotal: number;
    tax: number;
  };
  ORDER_STATUS_CHANGED: {
    orderId: string;
    storeId: string;
    customerPhone?: string;
    customerName?: string;
    orderNumber: string;
    oldStatus: string;
    newStatus: string;
    itemsSummary: string;
    total: number;
  };
  INVENTORY_LOW: {
    inventoryId: string;
    storeId: string;
    name: string;
    stock: number;
    threshold: number;
    unit: string;
  };
  PAYMENT_RECEIVED: {
    orderId: string;
    storeId: string;
    amount: number;
    paymentMethod: string;
    paymentStatus: string;
  };
  LOYALTY_UPDATED: {
    customerId: string;
    storeId: string;
    pointsEarned: number;
    totalPoints: number;
  };
  AUDIT_LOGGED: {
    storeId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
  };
}

export type EventCallback<T extends EventType> = (payload: EventPayloads[T]) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publish an event to the EventBus
   */
  public publish<T extends EventType>(type: T, payload: EventPayloads[T]): void {
    console.log(`[EventBus] Publish ${type}:`, payload);
    this.emitter.emit(type, payload);
  }

  /**
   * Subscribe to an event on the EventBus
   */
  public subscribe<T extends EventType>(type: T, callback: EventCallback<T>): void {
    this.emitter.on(type, callback as any);
  }

  /**
   * Unsubscribe from an event on the EventBus
   */
  public unsubscribe<T extends EventType>(type: T, callback: EventCallback<T>): void {
    this.emitter.off(type, callback as any);
  }
}
export const eventBus = EventBus.getInstance();
export default eventBus;
