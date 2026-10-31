import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../identity-access/prisma.service.js';
import { auditAuth } from '../identity-access/audit.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { AssessmentService } from '../assessment/assessment.service.js';
import { MoodleProvisionService } from './moodle-provision.service.js';
import { sweepIntervalToCron } from './moodle-access-sweep.service.js';

export const MOODLE_GRADE_SYNC_JOB = 'moodle-grade-sync';

const GRADE_SYNC_CAPABILITY = 'moodle:grade-sync';

interface SyncAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

/** One activity's grade set as published by the Moodle side. */
export interface GradeFeedBatch {
  courseRef: string;
  activityRef: string;
  revision: string;
  grades: Array<{ studentRef: string; rawValue?: number; outcome?: string }>;
}

export interface GradeFeed {
  batches: GradeFeedBatch[];
}

function feedBatches(payload: unknown): GradeFeedBatch[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const raw = Array.isArray(record.batches)
    ? record.batches
    : Array.isArray(payload)
      ? payload
      : record.courseRef
        ? [record]
        : [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const batch = entry as Record<string, unknown>;
    if (
      typeof batch.courseRef !== 'string' ||
      typeof batch.activityRef !== 'string' ||
      typeof batch.revision !== 'string' ||
      !Array.isArray(batch.grades)
    ) {
      return [];
    }
    return [
      {
        courseRef: batch.courseRef,
        activityRef: batch.activityRef,
        revision: batch.revision,
        grades: batch.grades.flatMap((line) => {
          if (!line || typeof line !== 'object') return [];
          const row = line as Record<string, unknown>;
          if (typeof row.studentRef !== 'string') return [];
          return [
            {
              studentRef: row.studentRef,
              ...(typeof row.rawValue === 'number' ? { rawValue: row.rawValue } : {}),
              ...(typeof row.outcome === 'string' ? { outcome: row.outcome } : {}),
            },
          ];
        }),
      },
    ];
  });
}

/**
 * Moodle -> SIS grade passback (design 2026-10-22).
 *
 * Guardrails, in order:
 *  1. automatic runs require MOODLE_GRADE_AUTO_SYNC=true; without it the
 *     scheduled job never starts and manual runs still need the capability.
 *  2. the feed must be configured (MOODLE_GRADE_FEED_URL); an unreachable
 *     source fails closed and changes nothing.
 *  3. every batch needs an ACTIVE grade mapping and an ACTIVE Moodle shell,
 *     enforced by AssessmentService.stageBatchFromSource.
 *  4. the result is always a staged snapshot. This service can never
 *     validate, moderate, publish or release a result.
 */
@Injectable()
export class MoodleGradeSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MoodleGradeSyncService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly provision: MoodleProvisionService,
    private readonly assessment: AssessmentService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  status() {
    return {
      autoSync: process.env.MOODLE_GRADE_AUTO_SYNC === 'true',
      feedConfigured: Boolean(process.env.MOODLE_GRADE_FEED_URL),
    };
  }

  onModuleInit() {
    if (process.env.VERCEL) return;
    if (process.env.MOODLE_GRADE_AUTO_SYNC !== 'true') return;
    if (!process.env.MOODLE_GRADE_FEED_URL) return;
    const minutes = Number(process.env.MOODLE_GRADE_SYNC_MINUTES ?? 30);
    const expression = sweepIntervalToCron(minutes);
    const job = new CronJob(expression, () => {
      void this.runAutomatic();
    });
    this.scheduler.addCronJob(MOODLE_GRADE_SYNC_JOB, job);
    job.start();
    this.logger.log(`Moodle grade sync scheduled: ${expression}`);
  }

  onModuleDestroy() {
    if (this.scheduler.getCronJobs().has(MOODLE_GRADE_SYNC_JOB)) {
      this.scheduler.deleteCronJob(MOODLE_GRADE_SYNC_JOB);
    }
  }

  /** Scheduled entry point: exits unless the approved flag and feed exist. */
  async runAutomatic() {
    if (this.isProcessing) return null;
    if (!this.status().autoSync || !this.status().feedConfigured) return null;
    this.isProcessing = true;
    try {
      return await this.ingest({ trigger: 'AUTOMATIC' });
    } catch (error) {
      this.logger.error('Moodle grade sync failed', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual entry point. Requires `moodle:grade-sync`; the automatic flag is
   * not needed for a staff-initiated run, but every other guardrail applies.
   */
  async runForActor(auth: SyncAuthority) {
    await this.provision.assertCapability(auth, GRADE_SYNC_CAPABILITY);
    if (!this.status().feedConfigured) {
      return {
        status: 'FEED_NOT_CONFIGURED' as const,
        message:
          'No Moodle grade feed is configured. Staged results are unchanged.',
        results: [],
      };
    }
    return this.ingest({ trigger: 'MANUAL', auth });
  }

  private async ingest(options: {
    trigger: 'MANUAL' | 'AUTOMATIC';
    auth?: SyncAuthority;
  }) {
    const url = process.env.MOODLE_GRADE_FEED_URL;
    if (!url) {
      return { status: 'FEED_NOT_CONFIGURED' as const, results: [] };
    }
    const token = process.env.MOODLE_GRADE_FEED_TOKEN;
    const response = await fetch(url, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!response || !response.ok) {
      // Fail closed: an unreachable source changes nothing.
      return {
        status: 'SOURCE_UNAVAILABLE' as const,
        message:
          'The Moodle grade source is unreachable. Staged results are unchanged; retry once it recovers.',
        results: [],
      };
    }
    const payload = await response.json().catch(() => null);
    const batches = feedBatches(payload);

    const results: Array<{
      courseRef: string;
      activityRef: string;
      revision: string;
      outcome: 'STAGED' | 'UNCHANGED' | 'SKIPPED' | 'FAILED';
      batchId?: string;
      reason?: string;
    }> = [];

    for (const batch of batches) {
      const mapping = await this.prisma.gradeActivityMapping.findFirst({
        where: {
          status: 'ACTIVE',
          moodleCourseRef: batch.courseRef,
          moodleActivityId: batch.activityRef,
        },
        orderBy: { version: 'desc' },
        select: { id: true },
      });
      if (!mapping) {
        results.push({
          courseRef: batch.courseRef,
          activityRef: batch.activityRef,
          revision: batch.revision,
          outcome: 'SKIPPED',
          reason: 'MAPPING_NOT_ACTIVE',
        });
        continue;
      }
      try {
        const staged = (await this.assessment.stageBatchFromSource({
          mappingId: mapping.id,
          sourceRevision: `${batch.courseRef}:${batch.activityRef}:${batch.revision}`,
          lines: batch.grades,
          reason: options.trigger === 'MANUAL' ? 'moodle-grade-sync-manual' : 'moodle-grade-sync-auto',
        })) as { body?: { id?: string } } | undefined;
        results.push({
          courseRef: batch.courseRef,
          activityRef: batch.activityRef,
          revision: batch.revision,
          outcome: 'STAGED',
          ...(staged?.body?.id ? { batchId: staged.body.id } : {}),
        });
      } catch (error) {
        results.push({
          courseRef: batch.courseRef,
          activityRef: batch.activityRef,
          revision: batch.revision,
          outcome: 'FAILED',
          reason:
            (error as { response?: { code?: string }; message?: string }).response
              ?.code ??
            (error as Error).message ??
            'UNKNOWN',
        });
      }
    }

    const summary = {
      status: 'COMPLETED' as const,
      trigger: options.trigger,
      batches: batches.length,
      staged: results.filter((r) => r.outcome === 'STAGED').length,
      skipped: results.filter((r) => r.outcome === 'SKIPPED').length,
      failed: results.filter((r) => r.outcome === 'FAILED').length,
      results,
    };

    await auditAuth(this.prisma, {
      action: 'CMD-Moodle-GradeSync',
      outcome: summary.failed > 0 ? 'DENY' : 'ALLOW',
      actorAccountId: options.auth?.accountId ?? 'SYSTEM',
      activeRole: options.auth?.activeRole ?? null,
      scope:
        options.auth?.scopeType && options.auth?.scopeRef
          ? `${options.auth.scopeType}:${options.auth.scopeRef}`
          : null,
      reason: `grade-sync-${options.trigger.toLowerCase()}`,
      purpose: 'moodle-grade-sync',
      idempotencyRef: randomUUID(),
      metadata: {
        batches: summary.batches,
        staged: summary.staged,
        skipped: summary.skipped,
        failed: summary.failed,
      },
    });

    this.logger.log(
      `Moodle grade sync (${options.trigger}): ${summary.staged}/${summary.batches} staged, ${summary.skipped} skipped, ${summary.failed} failed.`,
    );
    return summary;
  }
}
