import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MoodleProvisionService } from './moodle-provision.service.js';

export const MOODLE_ACCESS_SWEEP_JOB = 'moodle-access-sweep';

/**
 * Interval to a five-field cron expression. The cadence is bounded to
 * 5..59 minutes: a faster sweep would hammer the database, and an hourly
 * or slower sweep would leave lapsed access live for too long. Anything
 * invalid falls back to the default so a typo never stops the sweep.
 */
export function sweepIntervalToCron(minutes: number): string {
  const value =
    Number.isInteger(minutes) && minutes >= 5 && minutes <= 59 ? minutes : 15;
  return `*/${value} * * * *`;
}

/**
 * Moodle access expiry/drift daemon (design 2026-10-22).
 *
 * Access validity is a policy window, not a token TTL, so it must be
 * enforced even when nobody opens the app: this in-process scheduler runs
 * the SIS-side sweep that suspends Moodle enrolment for lapsed or drifted
 * assignments. It shares the NestJS scheduler with the IAM expiry daemon,
 * stops cleanly on shutdown, and never runs on short-lived serverless
 * deployments (the platform cron owns that case).
 */
@Injectable()
export class MoodleAccessSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MoodleAccessSweepService.name);
  private isProcessing = false;

  constructor(
    private readonly provision: MoodleProvisionService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit() {
    if (process.env.VERCEL) return;
    const minutes = Number(process.env.MOODLE_ACCESS_SWEEP_MINUTES ?? 15);
    const expression = sweepIntervalToCron(minutes);
    const job = new CronJob(expression, () => {
      void this.runSweep();
    });
    this.scheduler.addCronJob(MOODLE_ACCESS_SWEEP_JOB, job);
    job.start();
    this.logger.log(`Moodle access sweep scheduled: ${expression}`);
  }

  onModuleDestroy() {
    if (this.scheduler.getCronJobs().has(MOODLE_ACCESS_SWEEP_JOB)) {
      this.scheduler.deleteCronJob(MOODLE_ACCESS_SWEEP_JOB);
    }
  }

  async runSweep() {
    if (this.isProcessing) return null;
    this.isProcessing = true;
    try {
      return await this.provision.sweepExpiredAccess();
    } catch (error) {
      // A failed sweep must not wedge the daemon: log and let the next tick
      // retry. Access stays as-is rather than being revoked on a bad read.
      this.logger.error('Moodle access sweep failed', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }
}
