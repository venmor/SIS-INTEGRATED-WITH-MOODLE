import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MOODLE_DEMO_V1 as policy } from '@sis/config';
import { IntegrationService } from './integration.service.js';

/**
 * Outbox Delivery Worker (Task 1.6 / GAP-015 Row 6 + GAP-008/009).
 * Processes ALL outbox events (not just Moodle events) and routes them
 * to notification delivery handlers (email, SMS, internal, webhook).
 * Runs on a configurable interval with exponential backoff retry and dead-letter handling.
 */
@Injectable()
export class OutboxDeliveryWorker implements OnModuleInit, OnModuleDestroy {
  private running = false;

  constructor(
    private readonly scheduler: SchedulerRegistry,
    private readonly integration: IntegrationService,
  ) {}

  onModuleInit() {
    if (process.env.VERCEL) return;
    const seconds = (
      policy.worker as unknown as { intervalSeconds: number }
    ).intervalSeconds;
    const timer = setInterval(() => {
      void this.processOutbox().catch(() => undefined);
    }, seconds * 1000);
    timer.unref?.();
    this.scheduler.addInterval('outbox-delivery', timer as unknown as never);
  }

  onModuleDestroy() {
    try {
      this.scheduler.deleteInterval('outbox-delivery');
    } catch {
      // Never started (Vercel) — nothing to clear.
    }
  }

  /**
   * Process pending outbox events by delegating to IntegrationService.runWorker
   * which handles fetching pending events, delivery attempts, retries, and dead-lettering.
   */
  async processOutbox(limit = 25): Promise<{
    processed: number;
    delivered: number;
    retried: number;
    dead: number;
  }> {
    if (this.running) {
      return { processed: 0, delivered: 0, retried: 0, dead: 0 };
    }
    this.running = true;
    try {
      return await this.integration.runWorker(limit);
    } finally {
      this.running = false;
    }
  }
}