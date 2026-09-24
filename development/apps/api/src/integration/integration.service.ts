import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { MOODLE_DEMO_V1 as policy } from '@sis/config';
import { SimulatorError, type SimScenario } from './moodle-simulator.js';
import { ensureSimShell } from './moodle-simulator.js';
import {
  selectBackend,
  type MoodleAdapter,
  type ShellHandle,
} from './moodle-adapter.js';
import { SimulatorAdapter } from './moodle-sim-adapter.js';
import { LiveMoodleAdapter, MoodleApiError } from './moodle-live.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface IntegrationAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

// Phase 6 integration service (TASK-PH6-001..006). Slice 1: mapping
// registry with four-eyes lifecycle, synthetic validation, connection
// health (never secret values), and idempotent shell provisioning.
// Later slices add the delivery worker, simulator, cases and
// reconciliation to this module.
@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  fail(
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
          'Review the integration workspace state, or contact ICT services.',
        ...extra,
      },
      status,
    );
  }

  async liveAssignment(
    auth: IntegrationAuthority,
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

  async moodleAdmin(auth: IntegrationAuthority, capability: string) {
    const assignment = await this.liveAssignment(
      auth,
      'MOODLE_ADMIN',
      capability,
    );
    if (!assignment || auth.activeRole !== 'MOODLE_ADMIN') {
      throw new HttpException(
        { message: 'This integration workspace is unavailable.' },
        403,
      );
    }
  }

  async command(
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
          code: 'INTEGRATION_UNAVAILABLE',
          message:
            'The integration service could not complete this action. Check the current state before retrying.',
          supportReference: randomUUID(),
        },
        503,
      );
    }
  }

  async audit(
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
        activeRole: actor.activeRole ?? 'MOODLE_ADMIN',
        scope: `INTEGRATION:${id}`,
        targetRef: id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Moodle integration management',
        metadata: json(metadata),
      },
    });
  }

  mappingView(row: {
    id: string;
    kind: string;
    sisType: string;
    sisId: string;
    moodleId: string;
    version: number;
    status: string;
  }) {
    return {
      id: row.id,
      kind: row.kind,
      sisType: row.sisType,
      sisId: row.sisId,
      moodleId: row.moodleId,
      version: row.version,
      status: row.status,
    };
  }

  async ensureConnection(db: Tx | PrismaService) {
    const provider = policy.provider as unknown as string;
    const existing = await (db as Tx).moodleConnection.findUnique({
      where: { provider },
    });
    if (existing) return existing;
    return (db as Tx).moodleConnection.create({
      data: {
        provider,
        baseUrl: null,
        status: 'HEALTHY',
        capabilities: json(['shell', 'enrolment', 'groups']),
        lastCheckedAt: new Date(),
      },
    });
  }

  async connectionHealth(auth: IntegrationAuthority) {
    const admin = await this.liveAssignment(auth, 'MOODLE_ADMIN', 'sync-moodle');
    const support = await this.liveAssignment(
      auth,
      'INTEGRATION_SUPPORT',
      'replay-event',
    );
    if (
      !(
        (admin && auth.activeRole === 'MOODLE_ADMIN') ||
        (support && auth.activeRole === 'INTEGRATION_SUPPORT')
      )
    ) {
      throw new HttpException(
        { message: 'This integration workspace is unavailable.' },
        403,
      );
    }
    const connection = await this.ensureConnection(this.prisma);
    const inMaintenance = await this.maintenanceActive(this.prisma);
    const backend = selectBackend();
    // Live health performs a real version call; simulator answers locally.
    // Either way the response carries state, never secret values.
    let version: string | null = null;
    if (backend === 'live') {
      const checked = await this.adapter().validateConnection().catch(() => ({
        ok: false as const,
        backend: 'live' as const,
        version: null,
        detail: 'Live validation failed.',
      }));
      version = checked.version;
      if (!checked.ok) {
        return {
          provider: connection.provider,
          backend,
          version,
          status: 'Failing',
          detail: checked.detail,
          lastCheckedAt: connection.lastCheckedAt?.toISOString() ?? null,
        };
      }
    }
    return {
      provider: connection.provider,
      backend,
      version: backend === 'live' ? version : 'MOODLE-SIM-v1',
      status: inMaintenance ? 'MAINTENANCE' : connection.status,
      lastCheckedAt: connection.lastCheckedAt?.toISOString() ?? null,
    };
  }

  async draftMapping(
    auth: IntegrationAuthority,
    key: string,
    input: { kind: string; sisType: string; sisId: string; moodleId: string },
  ) {
    await this.moodleAdmin(auth, 'manage-mapping');
    const kinds = policy.mappingKinds as unknown as string[];
    if (!kinds.includes(input.kind)) {
      this.fail(
        'UNKNOWN_KIND',
        'Mapping kinds come from the approved registry.',
        400,
      );
    }
    const result = await this.command(
      auth,
      key,
      'DraftMoodleMapping',
      { ...input },
      async (db) => {
        const created = await db.moodleMapping.create({
          data: {
            kind: input.kind,
            sisType: input.sisType.trim(),
            sisId: input.sisId.trim(),
            moodleId: input.moodleId.trim(),
            version: 1,
            status: 'DRAFT',
            creatorAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'MoodleMappingDrafted', created.id, key, {
          kind: created.kind,
        });
        return { body: this.mappingView(created) };
      },
    );
    return result;
  }

  async testMapping(auth: IntegrationAuthority, key: string, id: string) {
    await this.moodleAdmin(auth, 'manage-mapping');
    const result = await this.command(
      auth,
      key,
      'TestMoodleMapping',
      { id },
      async (db) => {
        const row = await db.moodleMapping.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Mapping not found.', 404);
        // Synthetic validation: check the SIS side exists. Nothing is
        // written to any mapping or domain row by a test.
        const reasons: string[] = [];
        if (row.kind === 'SHELL') {
          const [offeringId, period] = row.sisId.split(':');
          const offering = await db.programmeOffering.findUnique({
            where: { id: offeringId },
          });
          if (!offering) reasons.push('SIS offering does not exist.');
          const academic = period
            ? await db.academicPeriod.findUnique({ where: { code: period } })
            : null;
          if (!academic) reasons.push('SIS academic period does not exist.');
        } else if (row.kind === 'GROUP') {
          const group = await db.tutorialGroup.findUnique({
            where: { id: row.sisId },
          });
          if (!group) reasons.push('SIS tutorial group does not exist.');
        } else if (row.kind === 'USER') {
          const account = await db.account.findUnique({
            where: { id: row.sisId },
          });
          if (!account) reasons.push('SIS account does not exist.');
        } else if (row.kind === 'ROLE') {
          const map = policy.roleMap as unknown as Record<string, string>;
          if (!map[row.sisId]) reasons.push('SIS role has no approved Moodle target.');
        }
        if (!row.moodleId.trim()) reasons.push('Moodle identifier is empty.');
        const passed = reasons.length === 0;
        await db.mappingCheck.create({
          data: {
            mappingId: row.id,
            result: passed ? 'PASS' : 'FAIL',
            reasons: json(reasons),
          },
        });
        await this.audit(db, auth, 'MoodleMappingTested', row.id, key, {
          result: passed ? 'PASS' : 'FAIL',
        });
        return { body: { id: row.id, result: passed ? 'PASS' : 'FAIL', reasons } };
      },
    );
    return result;
  }

  async activateMapping(auth: IntegrationAuthority, key: string, id: string) {
    await this.moodleAdmin(auth, 'manage-mapping');
    const result = await this.command(
      auth,
      key,
      'ActivateMoodleMapping',
      { id },
      async (db) => {
        const row = await db.moodleMapping.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Mapping not found.', 404);
        if (row.status === 'ACTIVE') {
          return { body: this.mappingView(row) };
        }
        // Four-eyes: the activator must differ from the creator.
        if (row.creatorAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message: 'A second officer must activate this mapping.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        const latest = await db.mappingCheck.findFirst({
          where: { mappingId: row.id },
          orderBy: { createdAt: 'desc' },
        });
        if (!latest || latest.result !== 'PASS') {
          this.fail(
            'TEST_REQUIRED',
            'Run a passing synthetic test before activation.',
            409,
          );
        }
        const maxVersion = await db.moodleMapping.aggregate({
          where: {
            kind: row.kind,
            sisType: row.sisType,
            sisId: row.sisId,
          },
          _max: { version: true },
        });
        await db.moodleMapping.updateMany({
          where: {
            kind: row.kind,
            sisType: row.sisType,
            sisId: row.sisId,
            status: 'ACTIVE',
          },
          data: { status: 'SUPERSEDED' },
        });
        const activated = await db.moodleMapping.update({
          where: { id: row.id },
          data: {
            status: 'ACTIVE',
            version: (maxVersion._max.version ?? 0) + 1,
            activatorAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'MoodleMappingActivated', row.id, key, {
          version: activated.version,
        });
        return { body: this.mappingView(activated) };
      },
    );
    return result;
  }

  async listMappings(auth: IntegrationAuthority) {
    const admin = await this.liveAssignment(auth, 'MOODLE_ADMIN', 'manage-mapping');
    const support = await this.liveAssignment(
      auth,
      'INTEGRATION_SUPPORT',
      'replay-event',
    );
    if (
      !(
        (admin && auth.activeRole === 'MOODLE_ADMIN') ||
        (support && auth.activeRole === 'INTEGRATION_SUPPORT')
      )
    ) {
      throw new HttpException(
        { message: 'This integration workspace is unavailable.' },
        403,
      );
    }
    const rows = await this.prisma.moodleMapping.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return { items: rows.map((r) => this.mappingView(r)) };
  }

  async provisionShell(
    auth: IntegrationAuthority,
    key: string,
    input: { offeringId: string; period?: string },
  ) {
    await this.moodleAdmin(auth, 'sync-moodle');
    const offering = await this.prisma.programmeOffering.findUnique({
      where: { id: input.offeringId },
      include: { programme: true },
    });
    if (!offering) this.fail('NOT_FOUND', 'Programme offering not found.', 404);
    const period = input.period
      ? await this.prisma.academicPeriod.findUnique({
          where: { code: input.period },
        })
      : await this.prisma.academicPeriod.findUnique({
          where: { code: '2026S1' },
        });
    if (!period) this.fail('NOT_FOUND', 'Academic period not found.', 404);
    const sisId = `${offering.id}:${period.code}`;
    const pattern = policy.shellIdPattern as unknown as string;
    const moodleId = pattern
      .replace('{programme}', offering.programme.code)
      .replace('{intake}', offering.intake);
    const result = await this.command(
      auth,
      key,
      'CreateMoodleCourseShell',
      { offeringId: input.offeringId, period: period.code },
      async (db) => {
        // Idempotent per offering + period: one shell, never two.
        const existing = await db.moodleMapping.findFirst({
          where: {
            kind: 'SHELL',
            sisType: 'OFFERING',
            sisId,
            status: 'ACTIVE',
          },
        });
        if (existing) return { body: this.mappingView(existing) };
        const created = await db.moodleMapping.create({
          data: {
            kind: 'SHELL',
            sisType: 'OFFERING',
            sisId,
            moodleId,
            version: 1,
            status: 'ACTIVE',
            creatorAccountId: auth.accountId,
            activatorAccountId: auth.accountId,
          },
        });
        await db.mappingCheck.create({
          data: {
            mappingId: created.id,
            result: 'PASS',
            reasons: json(['Provisioned from approved offering.']),
          },
        });
        await this.audit(db, auth, 'MoodleCourseShellCreated', created.id, key, {
          offeringId: offering.id,
          period: period.code,
        });
        return { body: this.mappingView(created) };
      },
    );
    return result;
  }

  adapter(): MoodleAdapter {
    if (selectBackend() === 'live') {
      return new LiveMoodleAdapter(this.prisma);
    }
    return new SimulatorAdapter(this.prisma);
  }

  async simulatorMode(): Promise<string> {
    const connection = await this.ensureConnection(this.prisma);
    const caps = (connection.capabilities ?? {}) as Record<string, unknown>;
    return typeof caps.scenario === 'string' ? caps.scenario : 'SUCCESS';
  }

  async setSimulatorMode(auth: IntegrationAuthority, mode: string) {
    if (process.env.DEMO_MODE !== 'true') {
      throw new HttpException({ message: 'Not found.' }, 404);
    }
    if (selectBackend() === 'live') {
      this.fail(
        'LIVE_BACKEND',
        'Simulator controls do not apply to a live connection.',
        400,
      );
    }
    await this.moodleAdmin(auth, 'sync-moodle');
    const scenarios = policy.simulator.scenarios as unknown as string[];
    if (!scenarios.includes(mode)) {
      this.fail('UNKNOWN_SCENARIO', 'This simulator mode does not exist.', 400);
    }
    const connection = await this.ensureConnection(this.prisma);
    const caps = {
      ...((connection.capabilities ?? {}) as Record<string, unknown>),
      scenario: mode,
    };
    const updated = await this.prisma.moodleConnection.update({
      where: { id: connection.id },
      data: {
        capabilities: json(caps),
        status: mode === 'OUTAGE' ? 'OUTAGE' : 'HEALTHY',
        lastCheckedAt: new Date(),
      },
    });
    if (mode === 'OUTAGE') {
      const open = await this.prisma.integrationIncident.findFirst({
        where: { title: 'Moodle simulator outage', status: { not: 'CLOSED' } },
      });
      if (!open) {
        await this.prisma.integrationIncident.create({
          data: {
            title: 'Moodle simulator outage',
            severity: 'HIGH',
            status: 'OPEN',
            ownerAccountId: auth.accountId,
            detail: json({
              note: 'Simulator forced unreachable; deliveries retry with backoff.',
            }),
          },
        });
      }
    }
    await this.prisma.auditEvent.create({
      data: {
        action: 'MoodleSimulatorModeChanged',
        actorAccountId: auth.accountId,
        activeRole: auth.activeRole ?? 'MOODLE_ADMIN',
        scope: `INTEGRATION:${updated.id}`,
        targetRef: updated.id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Moodle simulator demo control',
        metadata: json({ mode }),
      },
    });
    return { provider: updated.provider, status: updated.status, scenario: mode };
  }

  private async periodForOffering(db: Tx, offeringId: string) {
    const offering = await db.programmeOffering.findUniqueOrThrow({
      where: { id: offeringId },
    });
    const direct = await db.academicPeriod.findUnique({
      where: { code: offering.intake },
    });
    if (direct) return direct;
    const latest = await db.academicPeriod.findFirst({
      orderBy: { code: 'desc' },
    });
    if (!latest) throw new Error('MAP_PERIOD_GONE No academic period.');
    return latest;
  }

  private async shellFor(
    db: Tx,
    offeringId: string,
    periodCode: string,
  ): Promise<ShellHandle> {
    // Shells derive from approved offerings: ensure-or-return, never two.
    const offering = await db.programmeOffering.findUniqueOrThrow({
      where: { id: offeringId },
      include: { programme: true },
    });
    const period = await db.academicPeriod.findUniqueOrThrow({
      where: { code: periodCode },
    });
    const pattern = policy.shellIdPattern as unknown as string;
    const shellRef = pattern
      .replace('{programme}', offering.programme.code)
      .replace('{intake}', offering.intake);
    let mapping = await db.moodleMapping.findFirst({
      where: {
        kind: 'SHELL',
        sisType: 'OFFERING',
        sisId: `${offeringId}:${periodCode}`,
        status: 'ACTIVE',
      },
    });
    if (!mapping) {
      try {
        mapping = await db.moodleMapping.create({
          data: {
            kind: 'SHELL',
            sisType: 'OFFERING',
            sisId: `${offeringId}:${periodCode}`,
            moodleId: shellRef,
            version: 1,
            status: 'ACTIVE',
            creatorAccountId: 'SYSTEM',
            activatorAccountId: 'SYSTEM',
          },
        });
      } catch (error) {
        // Lost the race: fall back to the winner's mapping.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code !== 'P2002'
        )
          throw error;
        mapping = await db.moodleMapping.findFirst({
          where: {
            kind: 'SHELL',
            sisType: 'OFFERING',
            sisId: `${offeringId}:${periodCode}`,
            status: 'ACTIVE',
          },
        });
        if (!mapping) throw error;
      }
    }
    const adapter = this.adapter();
    if (adapter.backend === 'simulator') {
      const shell = await ensureSimShell(db, {
        shellRef,
        offeringId,
        periodId: period.id,
      });
      return { id: shell.id, ref: shellRef };
    }
    const live = await adapter.ensureShell({
      db,
      shellRef,
      offeringId,
      periodId: period.id,
    });
    return { id: live.id, ref: shellRef };
  }

  private async markDelivered(db: Tx, outboxId: string): Promise<void> {
    await db.integrationDeliveryAttempt.updateMany({
      where: { outboxId, state: { in: ['PENDING', 'DELIVERING'] } },
      data: { state: 'DELIVERED', deliveredAt: new Date() },
    });
    await db.outboxEvent.update({
      where: { id: outboxId },
      data: { deliveredAt: new Date() },
    });
  }

  private backoffSeconds(attempt: number): number {
    const base = (
      policy.worker as unknown as { baseDelaySeconds: number }
    ).baseDelaySeconds;
    const capped = Math.min(base * 2 ** Math.max(0, attempt - 1), 600);
    return capped + Math.floor(Math.random() * 5);
  }

  private async failAttempt(
    db: Tx,
    outboxId: string,
    attemptRowId: string,
    attempt: number,
    error: string,
    retryable: boolean,
  ): Promise<void> {
    const maxAttempts = (
      policy.worker as unknown as { maxAttempts: number }
    ).maxAttempts;
    if (!retryable) {
      await db.integrationDeliveryAttempt.update({
        where: { id: attemptRowId },
        data: { state: 'MANUAL_REVIEW', lastError: error },
      });
      return;
    }
    if (attempt >= maxAttempts) {
      await db.integrationDeliveryAttempt.update({
        where: { id: attemptRowId },
        data: { state: 'DEAD_LETTER', lastError: error },
      });
      return;
    }
    await db.integrationDeliveryAttempt.update({
      where: { id: attemptRowId },
      data: {
        state: 'PENDING',
        lastError: error,
        nextRunAt: new Date(Date.now() + this.backoffSeconds(attempt) * 1000),
      },
    });
  }

  async deliverOutbox(outboxId: string): Promise<{ outcome: string }> {
    return this.prisma.$transaction(async (db) => {
      const event = await db.outboxEvent.findUnique({
        where: { id: outboxId },
      });
      if (!event) this.fail('NOT_FOUND', 'Outbox event not found.', 404);
      if (event.deliveredAt) return { outcome: 'DUPLICATE' };
      const attemptRow = await db.integrationDeliveryAttempt.findFirst({
        where: { outboxId, state: { in: ['PENDING', 'DELIVERING'] } },
        orderBy: { createdAt: 'desc' },
      });
      const scenario = (await this.simulatorMode()) as SimScenario;
      // Active maintenance defers without consuming the retry budget:
      // the attempt resumes at the window end.
      const deferred = await this.prisma.$transaction(async (db) => {
        const window = await this.maintenanceWindow(db);
        if (!window) return null;
        const row = await db.integrationDeliveryAttempt.findFirst({
          where: { outboxId, state: { in: ['PENDING', 'DELIVERING'] } },
          orderBy: { createdAt: 'desc' },
        });
        if (row) {
          await db.integrationDeliveryAttempt.update({
            where: { id: row.id },
            data: {
              state: 'PENDING',
              lastError: 'Deferred for scheduled maintenance.',
              nextRunAt: window.endsAt,
            },
          });
        }
        return window;
      });
      if (deferred) return { outcome: 'RETRY' };
      const attemptNo = (attemptRow?.attempt ?? 0) + 1;
      const attemptId =
        attemptRow?.id ??
        (
          await db.integrationDeliveryAttempt.create({
            data: { outboxId, state: 'PENDING', attempt: 0 },
          })
        ).id;
      await db.integrationDeliveryAttempt.update({
        where: { id: attemptId },
        data: { state: 'DELIVERING', attempt: attemptNo },
      });
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      try {
        await this.routeDelivery(db, event.type, payload, scenario);
        await this.markDelivered(db, outboxId);
        return { outcome: 'DELIVERED' };
      } catch (error) {
        const message =
          error instanceof Error ? error.message.slice(0, 500) : 'Unknown error';
        // Permanent mapping/source failures go to manual review, never
        // infinite retry. Simulator outages/timeouts and retryable live
        // API failures reschedule with backoff.
        const permanent =
          message.startsWith('MAP_') || message.startsWith('SRC_');
        const retryable =
          !permanent &&
          (error instanceof SimulatorError ||
            (error instanceof MoodleApiError && error.retryable));
        await this.failAttempt(
          db,
          outboxId,
          attemptId,
          attemptNo,
          message,
          permanent ? false : retryable,
        );
        return { outcome: permanent ? 'MANUAL_REVIEW' : 'RETRY' };
      }
    });
  }

  private async routeDelivery(
    db: Tx,
    type: string,
    payload: Record<string, unknown>,
    scenario: SimScenario,
  ): Promise<void> {
    if (type === 'MoodleEnrolmentQueued') {
      await this.deliverEnrolment(
        db,
        payload as {
          registrationId: string;
          attemptId: string;
          period: string;
        },
        scenario,
      );
      return;
    }
    if (type === 'MoodleCourseAdded' || type === 'MoodleCourseRemoved') {
      await this.deliverCourseChange(
        db,
        payload as { registrationId: string; courseCode: string },
        type === 'MoodleCourseAdded',
        scenario,
      );
      return;
    }
    if (type === 'MoodleGroupSyncQueued') {
      await this.deliverGroupSync(
        db,
        payload as { groupId: string; studentId: string; action: string },
        scenario,
      );
      return;
    }
    if (type === 'MoodleTeachingRoleQueued') {
      await this.deliverTeachingRole(
        db,
        payload as { assignmentId: string },
        scenario,
      );
      return;
    }
    throw new Error(`MAP_UNKNOWN_TYPE Unknown outbox type ${type}.`);
  }

  private async deliverEnrolment(
    db: Tx,
    payload: { registrationId: string; attemptId: string; period: string },
    scenario: SimScenario,
  ): Promise<void> {
    const attempt = await db.programmeAttempt.findUnique({
      where: { id: payload.attemptId },
    });
    if (!attempt) throw new Error('SRC_ATTEMPT_GONE Attempt vanished.');
    const registration = await db.institutionalRegistration.findUnique({
      where: { id: payload.registrationId },
    });
    if (!registration) throw new Error('SRC_REGISTRATION_GONE Registration vanished.');
    const shell = await this.shellFor(db, attempt.offeringId, payload.period);
    const adapter = this.adapter();
    await adapter.applyEnrolment({
      db,
      shell,
      studentId: attempt.studentId,
      role: 'Student',
      scenario,
    });
    // Mirror active TG allocations for the offering at delivery time.
    const allocations = await db.tGAllocation.findMany({
      where: {
        studentId: attempt.studentId,
        status: 'ACTIVE',
        group: { offeringId: attempt.offeringId },
      },
    });
    for (const allocation of allocations) {
      await adapter.applyGroupMember({
        db,
        shell,
        groupId: allocation.groupId,
        studentId: allocation.studentId,
        scenario: scenario === 'MISMATCH' ? 'SUCCESS' : scenario,
      });
    }
  }

  private async deliverCourseChange(
    db: Tx,
    payload: { registrationId: string; courseCode: string },
    added: boolean,
    scenario: SimScenario,
  ): Promise<void> {
    const registration = await db.institutionalRegistration.findUnique({
      where: { id: payload.registrationId },
    });
    if (!registration) throw new Error('SRC_REGISTRATION_GONE Registration vanished.');
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { id: registration.attemptId },
    });
    const period = await this.periodForOffering(db, attempt.offeringId);
    const shell = await this.shellFor(db, attempt.offeringId, period.code);
    const adapter = this.adapter();
    if (added) {
      await adapter.applyEnrolment({
        db,
        shell,
        studentId: attempt.studentId,
        role: 'Student',
        scenario,
      });
    } else {
      await adapter.applyRemoval({
        db,
        shell,
        studentId: attempt.studentId,
        scenario,
      });
    }
  }

  private async deliverGroupSync(
    db: Tx,
    payload: { groupId: string; studentId: string; action: string },
    scenario: SimScenario,
  ): Promise<void> {
    const group = await db.tutorialGroup.findUnique({
      where: { id: payload.groupId },
      include: { offering: true },
    });
    if (!group) throw new Error('MAP_GROUP_GONE TG vanished.');
    const allocation = await db.tGAllocation.findFirst({
      where: { groupId: group.id, studentId: payload.studentId },
      orderBy: { createdAt: 'desc' },
    });
    const period = await this.periodForOffering(db, group.offeringId);
    const shell = await this.shellFor(db, group.offeringId, period.code);
    const active = allocation?.status === 'ACTIVE' && payload.action !== 'REMOVE';
    await this.adapter().applyGroupMember({
      db,
      shell,
      groupId: group.id,
      studentId: payload.studentId,
      scenario,
      remove: !active,
    });
  }

  private async deliverTeachingRole(
    db: Tx,
    payload: { assignmentId: string },
    scenario: SimScenario,
  ): Promise<void> {
    const assignment = await db.teachingAssignment.findUnique({
      where: { id: payload.assignmentId },
    });
    if (!assignment) throw new Error('SRC_ASSIGNMENT_GONE Assignment vanished.');
    if (assignment.status !== 'ACTIVE') {
      // Not yet active: leave pending for a later pass, not an error.
      throw new SimulatorError('TIMEOUT', 'Assignment not active yet.');
    }
    const offeringId =
      assignment.offeringId ??
      (
        await db.tutorialGroup.findUnique({
          where: { id: assignment.groupId ?? '' },
        })
      )?.offeringId;
    if (!offeringId) throw new Error('MAP_OFFERING_GONE No offering scope.');
    const offering = await db.programmeOffering.findUnique({
      where: { id: offeringId },
    });
    if (!offering) throw new Error('MAP_OFFERING_GONE Offering vanished.');
    const period = await db.academicPeriod.findFirst({
      orderBy: { code: 'desc' },
    });
    if (!period) throw new Error('MAP_PERIOD_GONE No period.');
    const shell = await this.shellFor(db, offeringId, period.code);
    const roleMap = policy.roleMap as unknown as Record<string, string>;
    const quizCap = 'QUIZ_CREATE_MARK';
    const hasQuiz = assignment.capabilities.includes(quizCap);
    let moodleRole = roleMap[assignment.role] ?? 'Tutor';
    let quizScope: unknown = null;
    if (assignment.role === 'Tutor' && hasQuiz) {
      moodleRole = roleMap['TutorQuiz'] ?? 'Non-editing Teacher';
      quizScope = assignment.groupId
        ? { groupIds: [assignment.groupId] }
        : { courseWide: true };
    }
    await this.adapter().applyStaffRole({
      db,
      shell,
      accountId: assignment.accountId,
      moodleRole,
      quizScope,
      scenario,
    });
  }

  async runWorker(limit = 25): Promise<{
    processed: number;
    delivered: number;
    retried: number;
    dead: number;
  }> {
    if (await this.deliveryPaused()) {
      return { processed: 0, delivered: 0, retried: 0, dead: 0 };
    }
    const now = new Date();
    const due = await this.prisma.integrationDeliveryAttempt.findMany({
      where: {
        state: 'PENDING',
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    let delivered = 0;
    let retried = 0;
    let dead = 0;
    for (const row of due) {
      const outcome = await this.deliverOutbox(row.outboxId);
      if (outcome.outcome === 'DELIVERED' || outcome.outcome === 'DUPLICATE')
        delivered += 1;
      else if (outcome.outcome === 'RETRY') retried += 1;
      else dead += 1;
    }
    // Also pick up outbox rows that never got an attempt row (legacy and
    // producer-direct rows): one attempt each, same idempotency.
    const orphaned = await this.prisma.outboxEvent.findMany({
      where: {
        type: { startsWith: 'Moodle' },
        deliveredAt: null,
        attempts: { none: {} },
      },
      orderBy: { occurredAt: 'asc' },
      take: Math.max(0, limit - due.length),
    });
    for (const event of orphaned) {
      await this.prisma.integrationDeliveryAttempt.create({
        data: { outboxId: event.id, state: 'PENDING', attempt: 0 },
      });
      const outcome = await this.deliverOutbox(event.id);
      if (outcome.outcome === 'DELIVERED' || outcome.outcome === 'DUPLICATE')
        delivered += 1;
      else if (outcome.outcome === 'RETRY') retried += 1;
      else dead += 1;
    }
    return { processed: due.length + orphaned.length, delivered, retried, dead };
  }

  private async opsRole(
    auth: IntegrationAuthority,
  ): Promise<'MOODLE_ADMIN' | 'INTEGRATION_SUPPORT'> {
    const admin = await this.liveAssignment(auth, 'MOODLE_ADMIN', 'sync-moodle');
    if (admin && auth.activeRole === 'MOODLE_ADMIN') return 'MOODLE_ADMIN';
    const support = await this.liveAssignment(
      auth,
      'INTEGRATION_SUPPORT',
      'replay-event',
    );
    if (support && auth.activeRole === 'INTEGRATION_SUPPORT')
      return 'INTEGRATION_SUPPORT';
    throw new HttpException(
      { message: 'This integration workspace is unavailable.' },
      403,
    );
  }

  async listDeliveries(auth: IntegrationAuthority) {
    await this.opsRole(auth);
    const rows = await this.prisma.integrationDeliveryAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { outbox: true },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        outboxId: r.outboxId,
        eventType: r.outbox.type,
        state: r.state,
        attempt: r.attempt,
        nextRunAt: r.nextRunAt ? r.nextRunAt.toISOString() : null,
        lastError: r.lastError,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async deliveryDetail(auth: IntegrationAuthority, id: string) {
    await this.opsRole(auth);
    const row = await this.prisma.integrationDeliveryAttempt.findUnique({
      where: { id },
      include: { outbox: true },
    });
    if (!row) this.fail('NOT_FOUND', 'Delivery attempt not found.', 404);
    const payload = (row.outbox.payload ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      outboxId: row.outboxId,
      eventType: row.outbox.type,
      state: row.state,
      attempt: row.attempt,
      nextRunAt: row.nextRunAt ? row.nextRunAt.toISOString() : null,
      lastError: row.lastError,
      envelope: {
        eventId: payload.eventId ?? null,
        eventType: payload.eventType ?? row.outbox.type,
        correlationId: payload.correlationId ?? null,
        idempotencyKey: payload.idempotencyKey ?? null,
        payloadVersion: payload.payloadVersion ?? null,
        retryPolicy: payload.retryPolicy ?? null,
      },
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listShells(auth: IntegrationAuthority) {
    await this.moodleAdmin(auth, 'sync-moodle');
    const rows = await this.prisma.simShell.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: {
          select: {
            enrolments: { where: { status: 'ACTIVE' } },
            groupMembers: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });
    return {
      items: rows.map((r) => ({
        shellRef: r.shellRef,
        offeringId: r.offeringId,
        periodId: r.periodId,
        status: r.status,
        activeEnrolments: r._count.enrolments,
        activeGroupMembers: r._count.groupMembers,
      })),
    };
  }

  async listEnrolments(auth: IntegrationAuthority) {
    await this.moodleAdmin(auth, 'sync-moodle');
    const rows = await this.prisma.simStudentEnrolment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const studentIds = [...new Set(rows.map((r) => r.studentId))];
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
    });
    const numbers = new Map(students.map((s) => [s.id, s.studentNumber]));
    return {
      items: rows.map((r) => ({
        id: r.id,
        shellId: r.shellId,
        studentNumber: numbers.get(r.studentId) ?? null,
        role: r.role,
        status: r.status,
      })),
    };
  }

  async scheduleMaintenance(
    auth: IntegrationAuthority,
    key: string,
    input: { reason: string; startsAt: string; endsAt: string },
  ) {
    await this.moodleAdmin(auth, 'sync-moodle');
    const startsAt = new Date(input.startsAt).getTime();
    const endsAt = new Date(input.endsAt).getTime();
    if (Number.isNaN(startsAt) || Number.isNaN(endsAt) || startsAt >= endsAt) {
      this.fail(
        'INVALID_WINDOW',
        'Maintenance needs a start before its end.',
        400,
      );
    }
    if (!input.reason.trim()) {
      this.fail('EMPTY_REASON', 'State the reason for maintenance.', 400);
    }
    const result = await this.command(
      auth,
      key,
      'ScheduleMoodleMaintenance',
      { ...input },
      async (db) => {
        const created = await db.moodleMaintenance.create({
          data: {
            reason: input.reason.trim(),
            startsAt: new Date(startsAt),
            endsAt: new Date(endsAt),
            status: 'SCHEDULED',
            creatorAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'MoodleMaintenanceScheduled', created.id, key, {
          reason: created.reason,
        });
        return {
          body: {
            id: created.id,
            status: created.status,
            startsAt: created.startsAt.toISOString(),
            endsAt: created.endsAt.toISOString(),
          },
        };
      },
    );
    return result;
  }

  async listMaintenance(auth: IntegrationAuthority) {
    await this.opsRole(auth);
    const rows = await this.prisma.moodleMaintenance.findMany({
      orderBy: { startsAt: 'asc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        startsAt: r.startsAt.toISOString(),
        endsAt: r.endsAt.toISOString(),
      })),
    };
  }

  async cancelMaintenance(auth: IntegrationAuthority, key: string, id: string) {
    await this.moodleAdmin(auth, 'sync-moodle');
    const result = await this.command(
      auth,
      key,
      'CancelMoodleMaintenance',
      { id },
      async (db) => {
        const row = await db.moodleMaintenance.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Maintenance window not found.', 404);
        if (row.status !== 'SCHEDULED') {
          this.fail(
            'REQUEST_CLOSED',
            'Only scheduled windows can be cancelled.',
            409,
          );
        }
        const updated = await db.moodleMaintenance.update({
          where: { id: row.id },
          data: { status: 'CANCELLED' },
        });
        await this.audit(db, auth, 'MoodleMaintenanceCancelled', row.id, key, {});
        return { body: { id: updated.id, status: updated.status } };
      },
    );
    return result;
  }

  async maintenanceActive(db: Tx): Promise<boolean> {
    return (await this.maintenanceWindow(db)) != null;
  }

  async maintenanceWindow(db: Tx): Promise<{ endsAt: Date } | null> {
    const now = new Date();
    const open = await db.moodleMaintenance.findFirst({
      where: {
        status: 'SCHEDULED',
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
    });
    return open ? { endsAt: open.endsAt } : null;
  }

  private async supportOfficer(auth: IntegrationAuthority): Promise<void> {
    const support = await this.liveAssignment(
      auth,
      'INTEGRATION_SUPPORT',
      'replay-event',
    );
    if (!support || auth.activeRole !== 'INTEGRATION_SUPPORT') {
      throw new HttpException(
        { message: 'This integration workspace is unavailable.' },
        403,
      );
    }
  }

  async deadLetters(auth: IntegrationAuthority) {
    await this.supportOfficer(auth);
    const rows = await this.prisma.integrationDeliveryAttempt.findMany({
      where: { state: { in: ['DEAD_LETTER', 'MANUAL_REVIEW'] } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { outbox: true },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        outboxId: r.outboxId,
        eventType: r.outbox.type,
        state: r.state,
        attempt: r.attempt,
        lastError: r.lastError,
      })),
    };
  }

  async requestReplay(
    auth: IntegrationAuthority,
    key: string,
    input: {
      attemptId?: string;
      rangeFrom?: string;
      rangeTo?: string;
      reason: string;
      declaration: boolean;
    },
  ) {
    await this.supportOfficer(auth);
    if (input.declaration !== true) {
      this.fail(
        'DECLARATION_REQUIRED',
        'Confirm you have reviewed the stated evidence within your assigned authority.',
        400,
      );
    }
    if (!input.reason.trim()) {
      this.fail('EMPTY_REASON', 'State why this replay is safe.', 400);
    }
    let evidence: Record<string, unknown>;
    let scope = 'attempt';
    if (input.attemptId) {
      const row = await this.prisma.integrationDeliveryAttempt.findUnique({
        where: { id: input.attemptId },
        include: { outbox: true },
      });
      if (!row) this.fail('NOT_FOUND', 'Delivery attempt not found.', 404);
      if (row.state !== 'DEAD_LETTER' && row.state !== 'MANUAL_REVIEW') {
        this.fail(
          'WRONG_STATE',
          'Only dead-letter or manual-review attempts take replay.',
          409,
        );
      }
      // Frozen evidence package: the decision signs exactly this state.
      evidence = {
        attemptId: row.id,
        outboxId: row.outboxId,
        eventType: row.outbox.type,
        state: row.state,
        attempt: row.attempt,
        lastError: row.lastError,
        reason: input.reason.trim(),
      };
    } else {
      if (!input.rangeFrom || !input.rangeTo) {
        this.fail(
          'RANGE_REQUIRED',
          'Name the attempt or the replay window.',
          400,
        );
      }
      const from = new Date(input.rangeFrom).getTime();
      const to = new Date(input.rangeTo).getTime();
      if (Number.isNaN(from) || Number.isNaN(to) || from >= to) {
        this.fail('INVALID_RANGE', 'The replay window is not valid.', 400);
      }
      scope = 'range';
      const count = await this.prisma.integrationDeliveryAttempt.count({
        where: {
          state: 'DEAD_LETTER',
          createdAt: { gte: new Date(from), lte: new Date(to) },
        },
      });
      evidence = {
        rangeFrom: input.rangeFrom,
        rangeTo: input.rangeTo,
        deadLetterCount: count,
        reason: input.reason.trim(),
      };
    }
    const result = await this.command(
      auth,
      key,
      'RequestIntegrationReplay',
      { scope, ...input },
      async (db) => {
        const created = await db.replayDecision.create({
          data: {
            scope,
            attemptId: input.attemptId ?? null,
            rangeFrom: input.rangeFrom ? new Date(input.rangeFrom) : null,
            rangeTo: input.rangeTo ? new Date(input.rangeTo) : null,
            evidence: json(evidence),
            declaration:
              'I confirm that I have reviewed the stated evidence and make this decision within my assigned authority.',
            status: 'PENDING',
            requesterAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'IntegrationReplayRequested', created.id, key, {
          scope,
        });
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result;
  }

  async listReplays(auth: IntegrationAuthority) {
    await this.supportOfficer(auth);
    const rows = await this.prisma.replayDecision.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        scope: r.scope,
        status: r.status,
        evidence: r.evidence,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async decideReplay(
    auth: IntegrationAuthority,
    key: string,
    id: string,
    input: { approve: boolean; note?: string },
  ) {
    await this.supportOfficer(auth);
    const result = await this.command(
      auth,
      key,
      input.approve ? 'ApproveIntegrationReplay' : 'DeclineIntegrationReplay',
      { id, ...input },
      async (db) => {
        const row = await db.replayDecision.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Replay decision not found.', 404);
        if (row.status !== 'PENDING') {
          this.fail('REQUEST_CLOSED', 'This replay is already decided.', 409);
        }
        // Four-eyes: the requester never decides their own replay.
        if (row.requesterAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message: 'A second officer must decide this replay.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        if (!input.approve && !input.note?.trim()) {
          this.fail('NOTE_REQUIRED', 'Declines require a reason.', 400);
        }
        const decided = await db.replayDecision.update({
          where: { id: row.id },
          data: {
            status: input.approve ? 'APPROVED' : 'REJECTED',
            deciderAccountId: auth.accountId,
            decidedAt: new Date(),
          },
        });
        if (input.approve) {
          // Replay preserves correlation and idempotency: attempts reset
          // to pending with budget restored, never duplicated or edited.
          if (row.scope === 'attempt' && row.attemptId) {
            await db.integrationDeliveryAttempt.update({
              where: { id: row.attemptId },
              data: {
                state: 'PENDING',
                attempt: 0,
                nextRunAt: new Date(),
                lastError: null,
              },
            });
          } else if (row.scope === 'range' && row.rangeFrom && row.rangeTo) {
            await db.integrationDeliveryAttempt.updateMany({
              where: {
                state: 'DEAD_LETTER',
                createdAt: { gte: row.rangeFrom, lte: row.rangeTo },
              },
              data: {
                state: 'PENDING',
                attempt: 0,
                nextRunAt: new Date(),
                lastError: null,
              },
            });
          }
        }
        await this.audit(
          db,
          auth,
          input.approve ? 'IntegrationReplayApproved' : 'IntegrationReplayDeclined',
          row.id,
          key,
          { note: input.note?.trim() || null },
        );
        return { body: { id: decided.id, status: decided.status } };
      },
    );
    return result;
  }

  async setPaused(
    auth: IntegrationAuthority,
    key: string,
    paused: boolean,
  ): Promise<{ paused: boolean }> {
    await this.supportOfficer(auth);
    const connection = await this.ensureConnection(this.prisma);
    const caps = {
      ...((connection.capabilities ?? {}) as Record<string, unknown>),
      paused,
    };
    await this.prisma.moodleConnection.update({
      where: { id: connection.id },
      data: { capabilities: json(caps), lastCheckedAt: new Date() },
    });
    await this.prisma.auditEvent.create({
      data: {
        action: paused ? 'IntegrationDeliveryPaused' : 'IntegrationDeliveryResumed',
        actorAccountId: auth.accountId,
        activeRole: auth.activeRole ?? 'INTEGRATION_SUPPORT',
        scope: `INTEGRATION:${connection.id}`,
        targetRef: connection.id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Integration delivery control',
        metadata: json({ paused }),
      },
    });
    return { paused };
  }

  async runReconciliation(
    auth: IntegrationAuthority,
  ): Promise<{ runId: string; diffs: number; repaired: number; cases: number }> {
    await this.opsRole(auth);
    const run = await this.prisma.reconciliationRun.create({
      data: { scope: 'FULL', status: 'RUNNING' },
    });
    let diffs = 0;
    let repaired = 0;
    let cases = 0;
    try {
      // Expected: SIS enrolment truth. Actual: backend projections
      // (simulator rows or live queries, same shape by contract).
      const adapter = this.adapter();
      const mappings = await this.prisma.moodleMapping.findMany({
        where: { kind: 'SHELL', sisType: 'OFFERING', status: 'ACTIVE' },
      });
      const shells: Array<{
        offeringId: string;
        handle: { id: string; ref: string };
      }> = [];
      for (const mapping of mappings) {
        const [offeringId] = mapping.sisId.split(':');
        if (adapter.backend === 'simulator') {
          const row = await this.prisma.simShell.findUnique({
            where: { shellRef: mapping.moodleId },
          });
          if (!row) continue;
          shells.push({
            offeringId,
            handle: { id: row.id, ref: mapping.moodleId },
          });
        } else {
          shells.push({
            offeringId,
            handle: { id: mapping.moodleId, ref: mapping.moodleId },
          });
        }
      }
      for (const shell of shells) {
        // Key space matches the backend: SIS row ids for the simulator,
        // Moodle idnumbers (student numbers) for live.
        const live = adapter.backend === 'live';
        const attempts = await this.prisma.programmeAttempt.findMany({
          where: { offeringId: shell.offeringId },
          select: { id: true, studentId: true },
        });
        const attemptIds = attempts.map((a) => a.id);
        const attemptStudent = new Map(attempts.map((a) => [a.id, a.studentId]));
        const roster = await this.prisma.courseRegistration.findMany({
          where: {
            status: 'ENROLLED',
            registration: { attemptId: { in: attemptIds } },
          },
          include: { registration: true },
        });
        let numberOf: (rowId: string) => string | undefined = (rowId) => rowId;
        if (live) {
          const students = await this.prisma.student.findMany({
            where: { id: { in: [...new Set(attempts.map((a) => a.studentId))] } },
            select: { id: true, studentNumber: true },
          });
          const numbers = new Map(students.map((s) => [s.id, s.studentNumber]));
          numberOf = (rowId: string) => numbers.get(rowId);
        }
        const expectedStudents = new Map<string, { studentId: string }>();
        for (const r of roster) {
          const rowId = attemptStudent.get(r.registration.attemptId);
          if (!rowId) continue;
          const actualKey = live ? numberOf(rowId) : rowId;
          if (actualKey) expectedStudents.set(actualKey, { studentId: rowId });
        }
        const actualEnrolments =
          adapter.backend === 'simulator'
            ? (
                await this.prisma.simStudentEnrolment.findMany({
                  where: { shellId: shell.handle.id },
                })
              ).map((e) => ({
                key: e.studentId,
                role: e.role,
                status: e.status as 'ACTIVE' | 'SUSPENDED',
              }))
            : await adapter.listActualEnrolments(shell.handle);
        const actual = new Map(actualEnrolments.map((e) => [e.key, e]));
        for (const [actualKey, expected] of expectedStudents) {
          const sim = actual.get(actualKey);
          if (!sim || sim.status !== 'ACTIVE' || sim.role !== 'Student') {
            diffs += 1;
            // Safe repair: requeue the registration's latest enrolment
            // event for idempotent redelivery.
            const latest = await this.prisma.outboxEvent.findFirst({
              where: {
                aggregate: 'InstitutionalRegistration',
                type: { startsWith: 'Moodle' },
              },
              orderBy: { occurredAt: 'desc' },
            });
            const ownerAttempt = attempts.find(
              (a) => a.studentId === expected.studentId,
            );
            const registration = ownerAttempt
              ? await this.prisma.institutionalRegistration.findFirst({
                  where: { attemptId: ownerAttempt.id },
                  orderBy: { createdAt: 'desc' },
                })
              : null;
            if (registration) {
              const pending = await this.prisma.integrationDeliveryAttempt.findFirst({
                where: {
                  outbox: { aggregateId: registration.id },
                  state: { in: ['PENDING', 'DELIVERING'] },
                },
              });
              if (!pending) {
                const source =
                  latest?.aggregateId === registration.id
                    ? latest
                    : await this.prisma.outboxEvent.findFirst({
                        where: { aggregateId: registration.id },
                        orderBy: { occurredAt: 'desc' },
                      });
                if (source) {
                  await this.prisma.integrationDeliveryAttempt.create({
                    data: {
                      outboxId: source.id,
                      state: 'PENDING',
                      attempt: 0,
                    },
                  });
                  repaired += 1;
                } else {
                  cases += await this.openReconCase(run.id, {
                    kind: 'MISSING_IN_MOODLE',
                    studentId: expected.studentId,
                    shellId: shell.handle.id,
                    detail: { note: 'No enrolment event to requeue.' },
                  });
                }
              }
            } else {
              cases += await this.openReconCase(run.id, {
                kind: 'UNEXPECTED_IN_MOODLE',
                studentId: expected.studentId,
                shellId: shell.handle.id,
                detail: { note: 'Simulator holds an enrolment with no SIS registration.' },
              });
            }
          }
        }
        for (const [actualKey, sim] of actual) {
          if (sim.status === 'ACTIVE' && !expectedStudents.has(actualKey)) {
            diffs += 1;
            cases += await this.openReconCase(run.id, {
              kind: 'UNEXPECTED_IN_MOODLE',
              shellId: shell.handle.id,
              detail: {
                externalKey: actualKey,
                note: 'Active Moodle-side enrolment with no enrolled SIS roster row.',
              },
              dedupeKey: actualKey,
            });
          }
          const expected = expectedStudents.get(actualKey);
          if (
            sim.status === 'ACTIVE' &&
            sim.role !== 'Student' &&
            expected
          ) {
            diffs += 1;
            cases += await this.openReconCase(run.id, {
              kind: 'ENROLMENT_MISMATCH',
              studentId: expected.studentId,
              shellId: shell.handle.id,
              detail: { role: sim.role, expected: 'Student' },
            });
          }
        }
        // Groups: SIS allocations vs backend mirrors, keyed by TG name +
        // student key so both backends compare identically.
        const allocations = await this.prisma.tGAllocation.findMany({
          where: {
            status: 'ACTIVE',
            group: { offeringId: shell.offeringId },
          },
          include: { group: true },
        });
        const groupNames = new Map(
          allocations.map((a) => [a.groupId, a.group.name]),
        );
        const simMembers =
          adapter.backend === 'simulator'
            ? (
                await this.prisma.simGroupMember.findMany({
                  where: { shellId: shell.handle.id, status: 'ACTIVE' },
                })
              ).map((m) => ({
                groupKey: groupNames.get(m.groupId) ?? m.groupId,
                studentKey: live ? numberOf(m.studentId) : m.studentId,
                status: m.status as 'ACTIVE' | 'SUSPENDED',
              }))
            : await adapter.listActualGroupMembers(shell.handle);
        const actualMembers = new Map(
          simMembers
            .filter((m) => m.status === 'ACTIVE' && m.studentKey)
            .map((m) => [`${m.groupKey}:${m.studentKey}`, m]),
        );
        for (const allocation of allocations) {
          const expectedKey = live
            ? `${allocation.group.name}:${numberOf(allocation.studentId)}`
            : `${allocation.group.name}:${allocation.studentId}`;
          if (!actualMembers.has(expectedKey)) {
            diffs += 1;
            await queueMoodleEvent(this.prisma, {
              aggregate: 'TutorialGroup',
              aggregateId: allocation.groupId,
              type: 'MoodleGroupSyncQueued',
              eventType: 'zm.sis.tutorial-group.member-changed.v1',
              payload: {
                groupId: allocation.groupId,
                studentId: allocation.studentId,
                action: 'ADD',
              },
              key: randomUUID(),
            });
            repaired += 1;
          }
        }
      }
      const summary = { diffs, repaired, cases };
      await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: { status: 'COMPLETED', finishedAt: new Date(), summary: summary as Prisma.InputJsonValue },
      });
      await this.prisma.auditEvent.create({
        data: {
          action: 'MoodleReconciliationRun',
          actorAccountId: auth.accountId,
          activeRole: auth.activeRole ?? 'MOODLE_ADMIN',
          scope: `INTEGRATION:${run.id}`,
          targetRef: run.id,
          outcome: 'ALLOW',
          correlationId: randomUUID(),
          policyVersion: policy.version,
          purpose: 'Expected-vs-actual reconciliation',
          metadata: json(summary),
        },
      });
      return { runId: run.id, ...summary };
    } catch (error) {
      await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  private async openReconCase(
    runId: string,
    input: {
      kind: string;
      studentId?: string;
      shellId?: string;
      detail: Record<string, unknown>;
      dedupeKey?: string;
    },
  ): Promise<number> {
    // Reruns converge: one open case per kind + subject. Unexpected
    // enrolments dedupe per external key so distinct drift rows each get
    // their own governed case.
    const base = {
      kind: input.kind,
      studentId: input.studentId ?? null,
      shellId: input.shellId ?? null,
      status: { in: ['OPEN', 'ESCALATED'] },
    };
    const existing = input.dedupeKey
      ? await this.prisma.reconciliationCase.findFirst({
          where: {
            ...base,
            detail: { path: ['externalKey'], equals: input.dedupeKey },
          },
        })
      : await this.prisma.reconciliationCase.findFirst({
          where: base,
        });
    if (existing) return 0;
    await this.prisma.reconciliationCase.create({
      data: {
        runId,
        kind: input.kind,
        status: 'OPEN',
        studentId: input.studentId,
        shellId: input.shellId,
        detail: json(input.detail),
      },
    });
    return 1;
  }

  async listReconCases(auth: IntegrationAuthority) {
    await this.opsRole(auth);
    const rows = await this.prisma.reconciliationCase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        status: r.status,
        studentId: r.studentId,
        createdAt: r.createdAt.toISOString(),
        resolution: r.resolution,
      })),
    };
  }

  async listReconRuns(auth: IntegrationAuthority) {
    await this.opsRole(auth);
    const rows = await this.prisma.reconciliationRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        scope: r.scope,
        status: r.status,
        summary: r.summary,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      })),
    };
  }

  async resolveReconCase(
    auth: IntegrationAuthority,
    key: string,
    id: string,
    input: { action: string; note?: string },
  ) {
    await this.opsRole(auth);
    if (
      !['REQUEUE', 'SUSPEND_ACCESS', 'ESCALATE', 'MARK_RESOLVED'].includes(
        input.action,
      )
    ) {
      this.fail(
        'UNKNOWN_ACTION',
        'Resolutions are requeue, suspend, escalate or mark resolved.',
        400,
      );
    }
    const result = await this.command(
      auth,
      key,
      'ResolveReconciliationCase',
      { id, ...input },
      async (db) => {
        const row = await db.reconciliationCase.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Reconciliation case not found.', 404);
        if (row.status !== 'OPEN' && row.status !== 'ESCALATED') {
          this.fail('REQUEST_CLOSED', 'This case is already resolved.', 409);
        }
        if (input.action === 'ESCALATE') {
          const escalated = await db.reconciliationCase.update({
            where: { id: row.id },
            data: { status: 'ESCALATED' },
          });
          await this.audit(db, auth, 'ReconciliationCaseEscalated', row.id, key, {
            note: input.note?.trim() || null,
          });
          return { body: { id: escalated.id, status: escalated.status } };
        }
        if (input.action === 'MARK_RESOLVED') {
          // Closure needs a reasoned resolution, never a bare note.
          if (!input.note || input.note.trim().length < 20) {
            this.fail(
              'EVIDENCE_REQUIRED',
              'Resolutions describe what proves the difference resolved.',
              400,
            );
          }
          const closed = await db.reconciliationCase.update({
            where: { id: row.id },
            data: {
              status: 'RESOLVED',
              resolution: input.note.trim(),
              resolvedAt: new Date(),
            },
          });
          await this.audit(db, auth, 'ReconciliationCaseResolved', row.id, key, {});
          return { body: { id: closed.id, status: closed.status } };
        }
        if (input.action === 'SUSPEND_ACCESS') {
          // Governed suspension: simulator access only, SIS untouched.
          // Simulator-only enrolments carry the student in the case
          // evidence rather than the SIS-linked column.
          const detail = (row.detail ?? {}) as Record<string, unknown>;
          const studentId =
            row.studentId ??
            (typeof detail.externalKey === 'string'
              ? detail.externalKey
              : null);
          if (!studentId || !row.shellId) {
            this.fail(
              'NOT_APPLICABLE',
              'Suspension needs a student and a shell.',
              400,
            );
          }
          const suspendAdapter = this.adapter();
          if (suspendAdapter.backend === 'live') {
            // Live shells address by the Moodle course id on the case;
            // the student travels as the Moodle idnumber in evidence.
            const detail = (row.detail ?? {}) as Record<string, unknown>;
            const idnumber =
              typeof detail.externalKey === 'string'
                ? detail.externalKey
                : studentId;
            await suspendAdapter.suspendAccess({
              db,
              shell: {
                id: row.shellId as string,
                ref: row.shellId as string,
              },
              studentKey: idnumber,
            });
          } else {
            const simShell = row.shellId
              ? await db.simShell.findUnique({
                  where: { id: row.shellId },
                })
              : null;
            if (simShell) {
              await suspendAdapter.suspendAccess({
                db,
                shell: { id: simShell.id, ref: simShell.shellRef },
                studentKey: studentId,
              });
            }
          }
          const closed = await db.reconciliationCase.update({
            where: { id: row.id },
            data: {
              status: 'RESOLVED',
              resolution: `Simulator access suspended by operations (${input.note?.trim() || 'no note'}). SIS registration untouched.`,
              resolvedAt: new Date(),
            },
          });
          await this.audit(db, auth, 'ReconciliationAccessSuspended', row.id, key, {});
          return { body: { id: closed.id, status: closed.status } };
        }
        // REQUEUE: safe repair through idempotent redelivery.
        const closed = await db.reconciliationCase.update({
          where: { id: row.id },
          data: {
            status: 'RESOLVED',
            resolution: `Requeued for idempotent redelivery (${input.note?.trim() || 'no note'}).`,
            resolvedAt: new Date(),
          },
        });
        await this.audit(db, auth, 'ReconciliationCaseRequeued', row.id, key, {});
        return { body: { id: closed.id, status: closed.status } };
      },
    );
    return result;
  }

  async validateConnection(auth: IntegrationAuthority) {
    await this.opsRole(auth);
    const checked = await this.adapter().validateConnection();
    return {
      backend: checked.backend,
      ok: checked.ok,
      version: checked.version,
      detail: checked.detail,
    };
  }

  async deliveryPaused(): Promise<boolean> {
    const connection = await this.ensureConnection(this.prisma);
    const caps = (connection.capabilities ?? {}) as Record<string, unknown>;
    return caps.paused === true;
  }

  async openIncident(
    auth: IntegrationAuthority,
    key: string,
    input: { title: string; severity: string; detail?: string },
  ) {
    await this.supportOfficer(auth);
    if (!input.title.trim()) this.fail('EMPTY_TITLE', 'Title the incident.', 400);
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(input.severity)) {
      this.fail('UNKNOWN_SEVERITY', 'Severity is LOW, MEDIUM, HIGH or CRITICAL.', 400);
    }
    const result = await this.command(
      auth,
      key,
      'AcknowledgeIntegrationIncident',
      { ...input },
      async (db) => {
        const created = await db.integrationIncident.create({
          data: {
            title: input.title.trim(),
            severity: input.severity,
            status: 'OPEN',
            ownerAccountId: auth.accountId,
            detail: json({ note: input.detail?.trim() || null }),
          },
        });
        await this.audit(db, auth, 'IntegrationIncidentOpened', created.id, key, {
          severity: created.severity,
        });
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result;
  }

  async listIncidents(auth: IntegrationAuthority) {
    await this.supportOfficer(auth);
    const rows = await this.prisma.integrationIncident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async closeIncident(
    auth: IntegrationAuthority,
    key: string,
    id: string,
    evidence: string,
  ) {
    await this.supportOfficer(auth);
    // Closure needs recovery evidence, never a bare note. Reconciliation
    // linkage is verified by the slice-6 engine; the evidence must say
    // what proves resolution.
    if (!evidence || evidence.trim().length < 20) {
      this.fail(
        'EVIDENCE_REQUIRED',
        'Closure needs recovery evidence describing what proves resolution.',
        400,
      );
    }
    const result = await this.command(
      auth,
      key,
      'CloseIntegrationIncident',
      { id },
      async (db) => {
        const row = await db.integrationIncident.findUnique({ where: { id } });
        if (!row) this.fail('NOT_FOUND', 'Incident not found.', 404);
        if (row.status === 'CLOSED') {
          this.fail('REQUEST_CLOSED', 'This incident is already closed.', 409);
        }
        const closed = await db.integrationIncident.update({
          where: { id: row.id },
          data: {
            status: 'CLOSED',
            closureEvidence: evidence.trim(),
            closedAt: new Date(),
          },
        });
        await this.audit(db, auth, 'IntegrationIncidentClosed', row.id, key, {});
        return { body: { id: closed.id, status: closed.status } };
      },
    );
    return result;
  }

  async runWorkerNow(auth: IntegrationAuthority): Promise<{
    processed: number;
    delivered: number;
    retried: number;
    dead: number;
  }> {
    // Demo/test trigger: runs the claim loop synchronously. Production
    // cadence comes from the scheduler (slice 3 worker precedent).
    const admin = await this.liveAssignment(auth, 'MOODLE_ADMIN', 'sync-moodle');
    const support = await this.liveAssignment(
      auth,
      'INTEGRATION_SUPPORT',
      'replay-event',
    );
    if (
      !(
        (admin && auth.activeRole === 'MOODLE_ADMIN') ||
        (support && auth.activeRole === 'INTEGRATION_SUPPORT')
      )
    ) {
      throw new HttpException(
        { message: 'This integration workspace is unavailable.' },
        403,
      );
    }
    return this.runWorker();
  }

  async deliveryFlags(
    outboxIds: string[],
  ): Promise<{ deadLetter: boolean; manual: boolean }> {
    if (outboxIds.length === 0) return { deadLetter: false, manual: false };
    const rows = await this.prisma.integrationDeliveryAttempt.findMany({
      where: { outboxId: { in: outboxIds } },
      select: { state: true },
    });
    return {
      deadLetter: rows.some((r) => r.state === 'DEAD_LETTER'),
      manual: rows.some((r) => r.state === 'MANUAL_REVIEW'),
    };
  }
}

// Shared producer helper (TASK-PH6-002 envelope): teaching and future
// producers queue Moodle events with the exact envelope. The legacy
// `type` stays for readers.
export async function queueMoodleEvent(
  db: Tx,
  input: {
    aggregate: string;
    aggregateId: string;
    type: string;
    eventType: string;
    payload: Record<string, unknown>;
    key: string;
  },
): Promise<string> {
  const eventId = randomUUID();
  await db.outboxEvent.create({
    data: {
      id: eventId,
      aggregate: input.aggregate,
      aggregateId: input.aggregateId,
      type: input.type,
      payload: JSON.parse(
        JSON.stringify({
          eventId,
          eventType: input.eventType,
          correlationId: input.key,
          idempotencyKey: input.key,
          payloadVersion: 1,
          deliveryStatus: 'QUEUED',
          retryPolicy: 'MOODLE-DEMO-v1',
          ...input.payload,
        }),
      ) as Prisma.InputJsonValue,
    },
  });
  return eventId;
}
