import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { randomUUID } from 'crypto';

// Slice-5 expiry daemon (TASK-PH1-005, REQ-IAM-003/REQ-OPS-004). Runs on the
// NestJS scheduler (in-process, DI-managed, graceful shutdown via
// ScheduleModule) — never a frozen setInterval. Cadence reads
// security.expiryCheckIntervalMinutes on every (re)sync, so admin config
// changes apply via resyncSchedule() without a restart. Each tick revokes
// lapsed assignments transactionally (assignment + audit + outbox + warning)
// with idempotent replay: revoked rows are skipped, warnings are
// one-open-per-assignment, outbox rows are marked deliveredAt when processed.
export const EXPIRY_CHECK_JOB = 'expiry-check';

export function intervalToCron(minutes: number): string {
  const n = Math.floor(minutes);
  // Invalid cadences fail loudly: a silently wrong schedule would leave
  // expired authority live. Config validation bounds this to integers 1..60.
  if (!Number.isInteger(minutes) || n < 1 || n > 60) {
    throw new Error(
      `Invalid expiry check interval: ${minutes} (expected integer 1..60 minutes)`,
    );
  }
  if (n === 60) return '0 * * * *';
  return `*/${n} * * * *`;
}

@Injectable()
export class ExpiryDaemonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiryDaemonService.name);
  private isProcessing = false;
  private currentExpression: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    // Vercel functions are request-started and short-lived. The approved
    // schedule needs a platform cron/worker before it can run there; starting
    // an in-process job during every cold start would also block liveness on a
    // database call. Local and long-running deployments retain the scheduler.
    if (process.env.VERCEL) return;
    await this.resyncSchedule();
  }

  onModuleDestroy() {
    if (this.scheduler.getCronJobs().has(EXPIRY_CHECK_JOB)) {
      this.scheduler.deleteCronJob(EXPIRY_CHECK_JOB);
    }
    this.currentExpression = null;
  }

  // Current cron expression (null before first sync). Exposed for
  // observability and scheduler proofs — never fabricate cadence elsewhere.
  getScheduleExpression(): string | null {
    return this.currentExpression;
  }

  // Re-read the configured cadence and (re)create the cron job when it
  // changed. Safe to call any time (admin config update, tests, boot).
  async resyncSchedule(): Promise<void> {
    const intervalMinutes = await this.config.getOrThrow<number>(
      'security.expiryCheckIntervalMinutes',
    );
    const expression = intervalToCron(intervalMinutes);
    if (
      expression === this.currentExpression &&
      this.scheduler.getCronJobs().has(EXPIRY_CHECK_JOB)
    ) {
      return;
    }
    if (this.scheduler.getCronJobs().has(EXPIRY_CHECK_JOB)) {
      this.scheduler.deleteCronJob(EXPIRY_CHECK_JOB);
    }
    const job = new CronJob(expression, () => {
      void this.runCheck();
    });
    this.scheduler.addCronJob(EXPIRY_CHECK_JOB, job);
    job.start();
    this.currentExpression = expression;
    this.logger.log(
      `Expiry daemon scheduled: ${expression} (every ${intervalMinutes} minute(s))`,
    );
  }

  async runCheck() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();

      // Pre-expiry sweep: assignments lapsing inside the warning threshold
      // surface one open warning each (countdown-eligible banner data),
      // without touching authority. Replay-safe like the revoke path.
      const thresholdMinutes = await this.config.getOrThrow<number>(
        'security.expiryWarningThresholdMinutes',
      );
      if (!Number.isFinite(thresholdMinutes) || thresholdMinutes < 1) {
        throw new Error(
          `Invalid expiry warning threshold: ${thresholdMinutes} (expected >= 1 minutes, matching DB minValue)`,
        );
      }
      const horizon = new Date(now.getTime() + thresholdMinutes * 60 * 1000);
      const nearing = await this.prisma.roleAssignment.findMany({
        where: { endsAt: { gt: now, lte: horizon }, revokedAt: null },
        select: { id: true },
        orderBy: { endsAt: 'asc' },
        take: 100,
      });
      for (const candidate of nearing) {
        const open = await this.prisma.expiryWarning.findFirst({
          where: { assignmentId: candidate.id, acknowledgedAt: null },
        });
        if (!open) {
          try {
            await this.prisma.expiryWarning.create({
              data: { assignmentId: candidate.id, warnedAt: now },
            });
          } catch {
            // Lost the race with a concurrent tick (partial unique on open
            // warnings): the other tick's warning stands, nothing duplicates.
          }
        }
      }

      // Revoke lapsed assignments in deterministic batches (oldest expiry
      // first) until none remain — no starvation past any batch size. A
      // full batch with zero claims means every row is failing
      // persistently: stop instead of spinning on the same rows forever
      // (a wedged tick would starve all future ticks via isProcessing).
      let processedCount = 0;
      for (;;) {
        const batch = await this.prisma.roleAssignment.findMany({
          where: { endsAt: { lte: now }, revokedAt: null },
          orderBy: { endsAt: 'asc' },
          take: 100,
        });
        if (batch.length === 0) break;
        this.logger.log(
          `Found ${batch.length} expired assignments. Revoking...`,
        );
        let claimedInBatch = 0;
        for (const assignment of batch) {
          const claimed = await this.processOneExpiry(assignment, now);
          if (claimed) {
            processedCount += 1;
            claimedInBatch += 1;
          }
        }
        if (batch.length < 100) break;
        if (claimedInBatch === 0) {
          this.logger.error(
            'Expiry daemon stuck: full batch claimed nothing; pausing this tick for operator review.',
          );
          break;
        }
      }

      // Observability advances on every tick, including idle ones.
      await this.updateDaemonState(now, processedCount);
    } catch (error) {
      this.logger.error('Error running expiry daemon check', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Revoke one lapsed assignment transactionally. Returns true when this
  // tick performed the revoke; false when a concurrent tick won the race
  // (guarded conditional update — never double-writes audit/outbox).
  private async processOneExpiry(
    assignment: {
      id: string;
      accountId: string;
      role: string;
      scopeType: string;
      scopeRef: string;
      endsAt: Date | null;
    },
    now: Date,
  ): Promise<boolean> {
    const correlationId = randomUUID();
    try {
      // The transaction reports whether this tick won the claim, so losers
      // never inflate processedCount.
      return await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.roleAssignment.updateMany({
          where: { id: assignment.id, revokedAt: null },
          data: {
            revokedAt: now,
            revokeReason: 'Auto-revoked by expiry daemon',
          },
        });
        if (claimed.count === 0) return false;

        // Sessions stay valid: SessionService.validateSession resolves a
        // revoked/expired assignment to a null workspace, so safe reads
        // (GET /auth/me) keep working while protected acts answer §12.12.
        // Never revoke the whole session here (recovery/break-glass own
        // the session-kill paths).

        await tx.auditEvent.create({
          data: {
            occurredAt: now,
            actorAccountId: 'SYSTEM',
            action: 'CMD-IAM-ExpiryDaemon',
            targetRef: assignment.id,
            outcome: 'DENY',
            reason: 'revoked-by-expiry',
            purpose: 'role-expiry',
            correlationId,
            priorState: {
              assignmentId: assignment.id,
              role: assignment.role,
              scopeType: assignment.scopeType,
              scopeRef: assignment.scopeRef,
              endsAt: assignment.endsAt,
              revokedAt: null,
            },
            newState: {
              assignmentId: assignment.id,
              revokedAt: now,
              revokeReason: 'Auto-revoked by expiry daemon',
            },
          },
        });

        await tx.outboxEvent.create({
          data: {
            aggregate: 'RoleAssignment',
            aggregateId: assignment.id,
            type: 'RoleAssignmentRevokedByExpiry',
            payload: {
              assignmentId: assignment.id,
              expiredAt: assignment.endsAt,
            },
            // Processed synchronously inside the revoke transaction:
            // marked delivered so replays stay idempotent.
            deliveredAt: now,
          },
        });

        // One open warning per assignment (replay-safe: never duplicate an
        // unacknowledged warning for the same assignment; the partial
        // unique index is the final guard under concurrent ticks).
        const openWarning = await tx.expiryWarning.findFirst({
          where: { assignmentId: assignment.id, acknowledgedAt: null },
        });
        if (!openWarning) {
          try {
            await tx.expiryWarning.create({
              data: { assignmentId: assignment.id, warnedAt: now },
            });
          } catch {
            // Concurrent tick won the race; its warning stands.
          }
        }

        // Emergency access ends completely on expiry (the justified
        // exception to null-workspace degradation): sessions bound to the
        // break-glass assignment die, the request is marked expired, and a
        // BreakGlassRevoked event closes the incident audit chain.
        if (assignment.scopeType === 'BREAK_GLASS') {
          await tx.session.updateMany({
            where: { activeAssignmentId: assignment.id, revokedAt: null },
            data: { revokedAt: now },
          });
          await tx.breakGlassRequest.updateMany({
            where: {
              requestorId: assignment.accountId,
              incidentRef: assignment.scopeRef,
              status: 'active',
            },
            data: { status: 'expired', revokedAt: now },
          });
          await tx.auditEvent.create({
            data: {
              occurredAt: now,
              actorAccountId: 'SYSTEM',
              action: 'CMD-IAM-BreakGlass',
              targetRef: assignment.id,
              outcome: 'DENY',
              reason: 'break-glass-expired',
              purpose: 'emergency-access',
              // One correlationId per audit row (column is UNIQUE): the
              // generic revoke audit above owns `correlationId`.
              correlationId: randomUUID(),
              priorState: { assignmentId: assignment.id, status: 'active' },
              newState: { assignmentId: assignment.id, status: 'expired' },
            },
          });
          await tx.outboxEvent.create({
            data: {
              aggregate: 'RoleAssignment',
              aggregateId: assignment.id,
              type: 'BreakGlassRevoked',
              payload: {
                assignmentId: assignment.id,
                incidentRef: assignment.scopeRef,
              },
              deliveredAt: now,
            },
          });
        }
        return true;
      });
    } catch (error) {
      this.logger.error(
        `Error revoking expired assignment ${assignment.id}`,
        error,
      );
      return false;
    }
  }

  private async updateDaemonState(lastRunAt: Date, processedCount: number) {
    const intervalMinutes = await this.config.getOrThrow<number>(
      'security.expiryCheckIntervalMinutes',
    );
    const nextRunAt = new Date(
      lastRunAt.getTime() + intervalMinutes * 60 * 1000,
    );

    const state = await this.prisma.expiryDaemonState.findFirst();
    if (state) {
      await this.prisma.expiryDaemonState.update({
        where: { id: state.id },
        data: {
          lastRunAt,
          nextRunAt,
          processedCount: state.processedCount + processedCount,
        },
      });
    } else {
      // Singleton by convention: a concurrent tick may win the create race;
      // fall back to updating the winner instead of duplicating the row.
      try {
        await this.prisma.expiryDaemonState.create({
          data: {
            lastRunAt,
            nextRunAt,
            processedCount,
          },
        });
      } catch {
        const winner = await this.prisma.expiryDaemonState.findFirst();
        if (winner) {
          await this.prisma.expiryDaemonState.update({
            where: { id: winner.id },
            data: {
              lastRunAt,
              nextRunAt,
              processedCount: winner.processedCount + processedCount,
            },
          });
        }
      }
    }
  }
}
