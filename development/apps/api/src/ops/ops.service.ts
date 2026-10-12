import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { OPS_SEVERITIES } from './dto.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface OpsAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

// Phase 8 slice 3: generic ops incident queue (TASK-PH8-003,
// GAP-009 interim). Cross-domain incidents auto-open convergently
// from dead-letters plus manual operator opens; one OPEN per
// (sourceKind, sourceRef) structurally. Lifecycle
// OPEN→ACKNOWLEDGED→RESOLVED→CLOSED closes only after recovery
// evidence. Authority: INTEGRATION_SUPPORT + live `replay-event`
// (interim demo doubling, recorded in the packet), MOODLE_ADMIN
// reads via the existing opsRole precedent.
@Injectable()
export class OpsService {
  constructor(private readonly prisma: PrismaService) {}

  private fail(
    code: string,
    message: string,
    status = 409,
    extra: Record<string, unknown> = {},
  ): never {
    throw new HttpException(
      {
        code,
        message,
        saved: false,
        supportReference: randomUUID(),
        nextAction:
          'Review the operations queue state, or contact the integration support office.',
        ...extra,
      },
      status,
    );
  }

  private denied(): never {
    throw new HttpException(
      { message: 'This operations workspace is unavailable.' },
      403,
    );
  }

  private async liveAssignment(
    auth: OpsAuthority,
    role: string,
    capability: string,
  ) {
    if (!auth.assignmentId) return null;
    const now = new Date();
    return this.prisma.roleAssignment.findFirst({
      where: {
        id: auth.assignmentId,
        accountId: auth.accountId,
        role,
        capabilities: { has: capability },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
    });
  }

  private async operator(auth: OpsAuthority) {
    const assignment = await this.liveAssignment(
      auth,
      'INTEGRATION_SUPPORT',
      'replay-event',
    );
    if (!assignment || auth.activeRole !== 'INTEGRATION_SUPPORT') {
      this.denied();
    }
  }

  private async queueReader(auth: OpsAuthority) {
    if (auth.activeRole === 'SYSADMIN') this.denied();
    const support = await this.liveAssignment(auth, 'INTEGRATION_SUPPORT', 'replay-event');
    if (support && auth.activeRole === 'INTEGRATION_SUPPORT') return;
    // MOODLE_ADMIN reads follow the existing opsRole() precedent.
    const admin = await this.liveAssignment(auth, 'MOODLE_ADMIN', 'sync-moodle');
    if (admin && auth.activeRole === 'MOODLE_ADMIN') return;
    this.denied();
  }

  private async command(
    actor: ActiveAuthority,
    key: string,
    action: string,
    payload: unknown,
    fn: (db: Tx) => Promise<{ status?: number; body: unknown }>,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    try {
      const result = await this.prisma.$transaction(
        async (db) => {
          await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR UPDATE`;
          const prior = await db.applicationCommand.findUnique({
            where: { key },
          });
          if (prior) {
            if (
              prior.accountId !== actor.accountId ||
              prior.action !== action ||
              prior.digest !== hash
            )
              this.fail(
                'IDEMPOTENCY_CONFLICT',
                'This request reference belongs to a different action. Review the current state.',
              );
            return { status: prior.status, body: prior.response };
          }
          const outcome = await fn(db);
          await db.applicationCommand.create({
            data: {
              key,
              accountId: actor.accountId,
              action,
              digest: hash,
              status: outcome.status ?? 201,
              response: json(outcome.body),
            },
          });
          return outcome;
        },
        { timeout: 15000 },
      );
      return result.body;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          code: 'OPS_UNAVAILABLE',
          message:
            'The operations service could not complete this action. Check the current state before retrying.',
          supportReference: randomUUID(),
        },
        503,
      );
    }
  }

  private async audit(
    db: Tx,
    actor: ActiveAuthority,
    action: string,
    id: string,
    key: string,
    metadata: unknown = {},
  ) {
    await db.auditEvent.create({
      data: {
        action,
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole ?? 'INTEGRATION_SUPPORT',
        scope: `OPS:${id}`,
        targetRef: id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        idempotencyRef: key,
        policyVersion: 'OPS-DEMO-v1',
        purpose: 'Operations incident governance',
        metadata: json(metadata),
      },
    });
  }

  private checkVersion(row: { version: number }, expected: number): void {
    if (row.version !== expected) {
      this.fail(
        'VERSION_CONFLICT',
        'This incident changed since it was reviewed. Reload the queue and try again with the current version.',
        409,
        { currentVersion: row.version },
      );
    }
  }

  private incidentView(row: {
    id: string;
    title: string;
    severity: string;
    status: string;
    sourceKind: string;
    sourceRef: string;
    ownerAccountId: string | null;
    ownerRole: string | null;
    version: number;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      severity: row.severity,
      status: row.status,
      sourceKind: row.sourceKind,
      sourceRef: row.sourceRef,
      ownerAccountId: row.ownerAccountId,
      ownerRole: row.ownerRole,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async openIncident(
    auth: OpsAuthority,
    key: string,
    input: { title: string; severity: string; sourceRef: string; detail?: string },
  ) {
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.operator(auth);
    if (!(OPS_SEVERITIES as readonly string[]).includes(input.severity)) {
      // DTO @IsIn already refuses unknown severities with 400; this
      // guards direct service callers with the coded shape.
      this.fail('INVALID_SEVERITY', 'Severity is LOW, MEDIUM, HIGH or CRITICAL only.', 400);
    }
    return this.command(auth, key, 'OpenOpsIncident', { sourceRef: input.sourceRef }, async (db) => {
      const created = await db.opsIncident.create({
        data: {
          title: input.title,
          severity: input.severity,
          status: 'OPEN',
          sourceKind: 'MANUAL',
          sourceRef: input.sourceRef,
          ownerAccountId: auth.accountId,
          ownerRole: auth.activeRole ?? 'INTEGRATION_SUPPORT',
          detail: json(input.detail ? { note: input.detail } : {}),
        },
      });
      await this.audit(db, auth, 'OpsIncidentOpened', created.id, key, {
        severity: input.severity,
      });
      return { status: 201, body: this.incidentView(created) };
    });
  }

  /**
   * Convergent auto-open for worker dead-letters (TASK-PH8-003): the
   * first dead-letter opens the incident; repeats replay the stored
   * one. Runs in the caller's transaction — never fails the domain
   * write. Mandatory-notification dead-letters never reach here (they
   * stay on the examinations lane; the console links them read-only).
   */
  async openFromDeadLetter(
    db: Tx,
    input: {
      sourceKind: 'NOTIFICATION_DELIVERY' | 'INTEGRATION_DELIVERY';
      sourceRef: string;
      title: string;
      severity: string;
      detail?: unknown;
    },
  ): Promise<{ id: string; opened: boolean }> {
    const existing = await db.opsIncident.findFirst({
      where: {
        sourceKind: input.sourceKind,
        sourceRef: input.sourceRef,
        status: 'OPEN',
      },
    });
    if (existing) return { id: existing.id, opened: false };
    const created = await db.opsIncident.create({
      data: {
        title: input.title,
        severity: input.severity,
        status: 'OPEN',
        sourceKind: input.sourceKind,
        sourceRef: input.sourceRef,
        detail: json(input.detail ?? {}),
      },
    });
    return { id: created.id, opened: true };
  }

  async acknowledgeIncident(
    auth: OpsAuthority,
    key: string,
    id: string,
    version: number,
    targetResponseAt?: string,
  ) {
    const found = await this.prisma.opsIncident.findUnique({ where: { id } });
    if (!found) this.fail('NOT_FOUND', 'Operations incident not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.operator(auth);
    return this.command(auth, key, 'AcknowledgeOpsIncident', { id, version }, async (db) => {
      await db.$queryRaw`SELECT id FROM "OpsIncident" WHERE id = ${id} FOR UPDATE`;
      const live = await db.opsIncident.findUniqueOrThrow({ where: { id } });
      this.checkVersion(live, version);
      if (live.status !== 'OPEN') {
        this.fail(
          'REQUEST_CLOSED',
          'Decided incidents keep their outcome. Open a new incident for follow-up work.',
          409,
        );
      }
      const updated = await db.opsIncident.update({
        where: { id: live.id },
        data: {
          status: 'ACKNOWLEDGED',
          ownerAccountId: auth.accountId,
          ownerRole: auth.activeRole ?? 'INTEGRATION_SUPPORT',
          targetResponseAt: targetResponseAt ? new Date(targetResponseAt) : null,
          version: { increment: 1 },
        },
      });
      await this.audit(db, auth, 'OpsIncidentAcknowledged', live.id, key, {});
      return { body: this.incidentView(updated) };
    });
  }

  async resolveIncident(
    auth: OpsAuthority,
    key: string,
    id: string,
    version: number,
    input: { rootCause: string; recoveryEvidence: string; preventiveAction?: string },
  ) {
    const found = await this.prisma.opsIncident.findUnique({ where: { id } });
    if (!found) this.fail('NOT_FOUND', 'Operations incident not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.operator(auth);
    return this.command(auth, key, 'ResolveOpsIncident', { id, version }, async (db) => {
      await db.$queryRaw`SELECT id FROM "OpsIncident" WHERE id = ${id} FOR UPDATE`;
      const live = await db.opsIncident.findUniqueOrThrow({ where: { id } });
      this.checkVersion(live, version);
      if (live.status !== 'ACKNOWLEDGED') {
        this.fail(
          'INVALID_TRANSITION',
          'Only acknowledged incidents resolve. Acknowledge first, then record recovery evidence.',
          409,
        );
      }
      const updated = await db.opsIncident.update({
        where: { id: live.id },
        data: {
          status: 'RESOLVED',
          rootCause: input.rootCause.trim(),
          recoveryEvidence: input.recoveryEvidence.trim(),
          preventiveAction: input.preventiveAction?.trim() || null,
          version: { increment: 1 },
        },
      });
      await this.audit(db, auth, 'OpsIncidentResolved', live.id, key, {});
      return { body: this.incidentView(updated) };
    });
  }

  async closeIncident(
    auth: OpsAuthority,
    key: string,
    id: string,
    version: number,
  ) {
    const found = await this.prisma.opsIncident.findUnique({ where: { id } });
    if (!found) this.fail('NOT_FOUND', 'Operations incident not found.', 404);
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.operator(auth);
    return this.command(auth, key, 'CloseOpsIncident', { id, version }, async (db) => {
      await db.$queryRaw`SELECT id FROM "OpsIncident" WHERE id = ${id} FOR UPDATE`;
      const live = await db.opsIncident.findUniqueOrThrow({ where: { id } });
      this.checkVersion(live, version);
      if (live.status !== 'RESOLVED') {
        this.fail(
          'INVALID_TRANSITION',
          'Only resolved incidents close. Resolve with recovery evidence first.',
          409,
        );
      }
      const updated = await db.opsIncident.update({
        where: { id: live.id },
        data: { status: 'CLOSED', version: { increment: 1 } },
      });
      await this.audit(db, auth, 'OpsIncidentClosed', live.id, key, {});
      return { body: this.incidentView(updated) };
    });
  }

  async sweepDeadLetters(
    auth: OpsAuthority,
    key: string,
    attemptId: string,
  ) {
    if (auth.activeRole === 'SYSADMIN') this.denied();
    await this.operator(auth);
    return this.command(auth, key, 'SweepIntegrationDeadLetters', { attemptId }, async (db) => {
      const attempt = await db.integrationDeliveryAttempt.findUnique({
        where: { id: attemptId },
        include: { outbox: true },
      });
      if (!attempt || attempt.state !== 'DEAD_LETTER') {
        this.fail(
          'NOT_FOUND',
          'Dead-letter attempt not found.',
          404,
        );
      }
      const opened = await this.openFromDeadLetter(db, {
        sourceKind: 'INTEGRATION_DELIVERY',
        sourceRef: attempt.id,
        title: `Integration delivery dead-lettered (${attempt.outbox.type})`,
        severity: 'HIGH',
        detail: { lastError: attempt.lastError, outboxId: attempt.outboxId },
      });
      await this.audit(db, auth, 'OpsDeadLettersSwept', opened.id, key, {
        attemptId,
        opened: opened.opened,
      });
      const row = await db.opsIncident.findUniqueOrThrow({ where: { id: opened.id } });
      return { status: 201, body: this.incidentView(row) };
    });
  }

  async listIncidents(
    auth: OpsAuthority,
    filters: { status?: string; openOnly?: boolean },
  ) {
    await this.queueReader(auth);
    const rows = await this.prisma.opsIncident.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.openOnly ? { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items: rows.map((r) => this.incidentView(r)) };
  }

  async incidentDetail(auth: OpsAuthority, id: string) {
    const row = await this.prisma.opsIncident.findUnique({ where: { id } });
    if (!row) this.fail('NOT_FOUND', 'Operations incident not found.', 404);
    await this.queueReader(auth);
    return this.incidentView(row);
  }

  async queueOverview(auth: OpsAuthority) {
    await this.queueReader(auth);
    const [open, acknowledged, notificationDead, integrationDead, pendingReplays, escalations, reconCases, latest, recent] =
      await Promise.all([
        this.prisma.opsIncident.count({ where: { status: 'OPEN' } }),
        this.prisma.opsIncident.count({ where: { status: 'ACKNOWLEDGED' } }),
        this.prisma.notificationDelivery.count({ where: { state: 'DEAD_LETTER' } }),
        this.prisma.integrationDeliveryAttempt.count({ where: { state: 'DEAD_LETTER' } }),
        this.prisma.replayDecision.count({ where: { status: 'PENDING' } }),
        this.prisma.notificationRecord.count({
          where: { event: 'NOTICE_ESCALATED', status: 'OPEN' },
        }),
        this.prisma.reconciliationCase.count({ where: { status: 'OPEN' } }),
        this.prisma.opsIncident.findMany({
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.opsIncident.findMany({
          where: { status: { in: ['RESOLVED', 'CLOSED'] } },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
      ]);
    return {
      openIncidents: open,
      acknowledgedIncidents: acknowledged,
      pendingNotificationDeadLetters: notificationDead,
      pendingIntegrationDeadLetters: integrationDead,
      pendingReplays: pendingReplays,
      openEscalations: escalations,
      openReconCases: reconCases,
      latest: latest.map((r) => this.incidentView(r)),
      recentlyResolved: recent.map((r) => ({
        ...this.incidentView(r),
        rootCause: r.rootCause,
        recoveryEvidence: r.recoveryEvidence,
      })),
    };
  }
}
