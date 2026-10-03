import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NOTIFY_DEMO_V1 as policy } from '@sis/config';
import { NotificationsService } from './notifications.service.js';

// Notification delivery worker (TASK-PH8-001). Claims due deliveries
// on a short interval and advances them through the SIM-NOTIFY-v1
// provider. Same precedent as the Moodle delivery worker and the
// expiry daemon: skips entirely on Vercel, re-entrant-safe
// single-flight ticks, interval from versioned policy.
@Injectable()
export class NotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private running = false;

  constructor(
    private readonly scheduler: SchedulerRegistry,
    private readonly notifications: NotificationsService,
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
    this.scheduler.addInterval('notification-delivery', timer as unknown as never);
  }

  onModuleDestroy() {
    try {
      this.scheduler.deleteInterval('notification-delivery');
    } catch {
      // Never started (Vercel) — nothing to clear.
    }
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.notifications.runWorker();
    } finally {
      this.running = false;
    }
  }
}
