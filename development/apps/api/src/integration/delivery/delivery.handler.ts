import { OutboxEvent } from '@prisma/client';

/** Result of a delivery attempt */
export interface DeliveryResult {
  success: boolean;
  externalId?: string;      // Provider-specific ID (message ID, webhook response ID, etc.)
  error?: string;           // Error message if failed
  retryable?: boolean;      // Whether the failure is retryable
  metadata?: Record<string, unknown>; // Additional provider-specific data
}

/** Configuration for a delivery target */
export interface DeliveryTarget {
  type: 'webhook' | 'email' | 'sms' | 'internal';
  config: Record<string, unknown>;
}

/** Base interface for all delivery handlers */
export interface DeliveryHandler {
  /** Unique identifier for this handler */
  readonly name: string;

  /** Check if this handler can deliver the given event type */
  supports(eventType: string): boolean;

  /** Determine the delivery target for an event */
  getTarget(event: OutboxEvent): DeliveryTarget | null;

  /** Deliver the event */
  deliver(event: OutboxEvent, target: DeliveryTarget): Promise<DeliveryResult>;
}

/** Registry for delivery handlers */
export class DeliveryHandlerRegistry {
  private handlers: DeliveryHandler[] = [];

  register(handler: DeliveryHandler): void {
    this.handlers.push(handler);
  }

  getHandler(eventType: string): DeliveryHandler | undefined {
    return this.handlers.find((h) => h.supports(eventType));
  }

  getAllHandlers(): readonly DeliveryHandler[] {
    return this.handlers;
  }
}

/** Global registry instance */
export const deliveryHandlerRegistry = new DeliveryHandlerRegistry();