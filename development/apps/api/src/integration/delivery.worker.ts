import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MOODLE_DEMO_V1 as policy } from '@sis/config';
import { IntegrationService } from './integration.service.js';

// Moodle delivery worker (TASK-PH6-003). Claims due delivery attempts on
// a short interval and delivers them through the simulator adapter.
// Same precedent as the expiry daemon: skips entirely on Vercel,
// re-entrant-safe single-flight ticks, interval from versioned policy.
@Injectable()
export class DeliveryWorker implements OnModuleInit, OnModuleDestroy {
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
      void this.tick().catch(() => undefined);
    }, seconds * 1000);
    timer.unref?.();
    this.scheduler.addInterval('moodle-delivery', timer as unknown as never);
  }

  onModuleDestroy() {
    try {
      this.scheduler.deleteInterval('moodle-delivery');
    } catch {
      // Never started (Vercel) — nothing to clear.
    }
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.integration.runWorker();
    } finally {
      this.running = false;
    }
  }
}
