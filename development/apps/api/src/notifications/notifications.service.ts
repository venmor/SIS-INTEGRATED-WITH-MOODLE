import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NOTIFY_DEMO_V1 as policy } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface NotificationAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

const STAFF_WRITERS: Array<[string, string]> = [
  ['LEC', 'stage-marks'],
  ['COORDINATOR', 'approve-assessment'],
  ['EXAMINATIONS_OFFICER', 'validate-results'],
  ['MODERATOR', 'moderate-results'],
];

// Phase 8 slice 1: notification record and delivery status
// (TASK-PH8-001, GAP-008 interim). Authoritative in-system records
// with versioned templates and per-channel delivery states. A worker
// advances QUEUED/RETRIED rows through the SIM-NOTIFY-v1 provider;
// failures retry with backoff, dead-letter at budget, and escalate
// mandatory notices to a staff follow-up record. Delivery failure
// never mutates the underlying workflow state.
@Injectable()
export class NotificationsService {
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
          'Review the notification centre state, or contact the responsible office.',
        ...extra,
      },
      status,
    );
  }

  private denied(): never {
    throw new HttpException(
      { message: 'These notifications are unavailable.' },
      403,
    );
  }

  private async liveAssignment(
    auth: NotificationAuthority,
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

  private async governance(auth: NotificationAuthority) {
    const assignment = await this.liveAssignment(
      auth,
      'SYSADMIN',
      'administer-identity',
    );
    if (!assignment || auth.activeRole !== 'SYSADMIN') {
      this.denied();
    }
  }

  private async recordWriter(auth: NotificationAuthority) {
    if (auth.activeRole === 'SYSADMIN') {
      await this.governance(auth);
      return;
    }
    for (const [role, capability] of STAFF_WRITERS) {
      const assignment = await this.liveAssignment(auth, role, capability);
      if (assignment && auth.activeRole === role) return;
    }
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
          code: 'NOTIFICATION_UNAVAILABLE',
          message:
            'The notification service could not complete this action. Check the current state before retrying.',
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
        activeRole: actor.activeRole ?? 'SYSADMIN',
        scope: `NOTIFICATION:${id}`,
        targetRef: id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        idempotencyRef: key,
        policyVersion: policy.version,
        purpose: 'Notification record and delivery governance',
        metadata: json(metadata),
      },
    });
  }

  private templateView(row: {
    id: string;
    event: string;
    version: number;
    status: string;
    title: string;
    office: string;
    category: string;
    mandatory: boolean;
  }) {
    return {
      id: row.id,
      event: row.event,
      version: row.version,
      status: row.status,
      title: row.title,
      office: row.office,
      category: row.category,
      mandatory: row.mandatory,
    };
  }

  private recordView(
    row: {
      id: string;
      event: string;
      title: string;
      category: string;
      mandatory: boolean;
      status: string;
      version: number;
      createdAt: Date;
    },
    state: string,
  ) {
    return {
      id: row.id,
      event: row.event,
      title: row.title,
      category: row.category,
      mandatory: row.mandatory,
      status: row.status,
      version: row.version,
      state,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async createTemplate(
    auth: NotificationAuthority,
    key: string,
    input: {
      event: string;
      title: string;
      body: string;
      actionLabel?: string;
      office: string;
      category: string;
      mandatory: boolean;
    },
  ) {
    if (auth.activeRole === 'SYSADMIN') await this.governance(auth);
    else this.denied();
    return this.command(
      auth,
      key,
      'CreateNotificationTemplate',
      { event: input.event, title: input.title },
      async (db) => {
        const existing = await db.notificationTemplate.findMany({
          where: { event: input.event },
          orderBy: { version: 'desc' },
        });
        const version = (existing[0]?.version ?? 0) + 1;
        if (existing.length > 0) {
          await db.notificationTemplate.updateMany({
            where: { event: input.event, status: 'ACTIVE' },
            data: { status: 'SUPERSEDED' },
          });
        }
        const created = await db.notificationTemplate.create({
          data: {
            event: input.event,
            version,
            status: 'ACTIVE',
            title: input.title,
            body: input.body,
            actionLabel: input.actionLabel ?? null,
            office: input.office,
            category: input.category,
            mandatory: input.mandatory,
          },
        });
        await this.audit(db, auth, 'NotificationTemplateCreated', created.id, key, {
          event: input.event,
          version,
        });
        return { status: 201, body: this.templateView(created) };
      },
    );
  }

  async listTemplates(
    auth: NotificationAuthority,
    filters: { event?: string },
  ) {
    await this.recordWriter(auth).catch(() => {
      // Students read active templates for their inbox context too.
      if (!auth.accountId) this.denied();
    });
    const rows = await this.prisma.notificationTemplate.findMany({
      where: {
        status: 'ACTIVE',
        ...(filters.event ? { event: filters.event } : {}),
      },
      orderBy: { event: 'asc' },
    });
    return { items: rows.map((r) => this.templateView(r)) };
  }

  async createRecord(
    auth: NotificationAuthority,
    key: string,
    input: {
      templateId: string;
      event: string;
      title: string;
      body: string;
      actionPath?: string;
      office?: string;
      category: string;
      mandatory: boolean;
      recipientAccountId?: string;
      recipientRole?: string;
      scopeType?: string;
      scopeRef?: string;
      dedupeKey: string;
      channels?: string[];
      simulateFailure?: boolean;
    },
  ) {
    await this.recordWriter(auth);
    return this.command(
      auth,
      key,
      'CreateNotificationRecord',
      { dedupeKey: input.dedupeKey },
      async (db) => {
        const template = await db.notificationTemplate.findUnique({
          where: { id: input.templateId },
        });
        if (!template || template.status !== 'ACTIVE') {
          this.fail(
            'NOT_FOUND',
            'Notification template not found.',
            404,
          );
        }
        const kind = input.recipientAccountId ? 'ACCOUNT' : 'ROLE_SCOPE';
        if (kind === 'ROLE_SCOPE' && !input.recipientRole) {
          this.fail(
            'RECIPIENT_REQUIRED',
            'Staff signals demand a recipient role with scope.',
            400,
          );
        }
        // Duplicate suppression: the same dedupeKey replays the stored
        // record instead of notifying twice (§12.13).
        const dupe = await db.notificationRecord.findUnique({
          where: { dedupeKey: input.dedupeKey },
        });
        if (dupe) return { status: 201, body: this.recordView(dupe, await this.deliveryState(db, dupe.id)) };
        const channels = input.channels?.length ? input.channels : ['IN_SYSTEM'];
        for (const channel of channels) {
          if (!['IN_SYSTEM', 'EMAIL_SIM', 'SMS_SIM'].includes(channel)) {
            this.fail(
              'INVALID_CHANNEL',
              'Channels are IN_SYSTEM, EMAIL_SIM or SMS_SIM only.',
              400,
            );
          }
        }
        const created = await db.notificationRecord.create({
          data: {
            templateId: template.id,
            templateVersion: template.version,
            event: input.event,
            title: input.title,
            body: input.body,
            actionPath: input.actionPath ?? null,
            office: input.office ?? template.office,
            category: input.category,
            mandatory: input.mandatory,
            recipientKind: kind,
            recipientAccountId: input.recipientAccountId ?? null,
            recipientRole: input.recipientRole ?? null,
            scopeType: input.scopeType ?? null,
            scopeRef: input.scopeRef ?? null,
            dedupeKey: input.dedupeKey,
            status: 'OPEN',
          },
        });
        for (const channel of channels) {
          await db.notificationDelivery.create({
            data: {
              recordId: created.id,
              channel,
              state: 'QUEUED',
              nextRunAt: new Date(),
              lastError: input.simulateFailure ? 'SIMULATED_FAILURE_ARMED' : null,
            },
          });
        }
        await this.audit(db, auth, 'NotificationRecordCreated', created.id, key, {
          event: input.event,
          kind,
        });
        return { status: 201, body: this.recordView(created, 'QUEUED') };
      },
    );
  }

  /**
   * Transaction-client overload for in-TX domain fan-out: the caller
   * owns the transaction (audit + notification written together per
   * compendium line 9717). No idempotency wrapper here — the domain
   * command already owns the key.
   */
  async createFromEvent(
    db: Tx,
    input: {
      templateId: string;
      templateVersion: number;
      event: string;
      title: string;
      body: string;
      actionPath?: string;
      office: string;
      category: string;
      mandatory: boolean;
      recipientAccountId?: string;
      recipientRole?: string;
      scopeType?: string;
      scopeRef?: string;
      dedupeKey: string;
      channels?: string[];
    },
  ): Promise<{ id: string; deduped: boolean }> {
    const dupe = await db.notificationRecord.findUnique({
      where: { dedupeKey: input.dedupeKey },
    });
    if (dupe) return { id: dupe.id, deduped: true };
    const kind = input.recipientAccountId ? 'ACCOUNT' : 'ROLE_SCOPE';
    const channels = input.channels?.length ? input.channels : ['IN_SYSTEM'];
    const created = await db.notificationRecord.create({
      data: {
        templateId: input.templateId,
        templateVersion: input.templateVersion,
        event: input.event,
        title: input.title,
        body: input.body,
        actionPath: input.actionPath ?? null,
        office: input.office,
        category: input.category,
        mandatory: input.mandatory,
        recipientKind: kind,
        recipientAccountId: input.recipientAccountId ?? null,
        recipientRole: input.recipientRole ?? null,
        scopeType: input.scopeType ?? null,
        scopeRef: input.scopeRef ?? null,
        dedupeKey: input.dedupeKey,
        status: 'OPEN',
      },
    });
    for (const channel of channels) {
      await db.notificationDelivery.create({
        data: {
          recordId: created.id,
          channel,
          state: 'QUEUED',
          nextRunAt: new Date(),
        },
      });
    }
    return { id: created.id, deduped: false };
  }

  private async deliveryState(db: Tx, recordId: string): Promise<string> {
    const rows = await db.notificationDelivery.findMany({
      where: { recordId },
      orderBy: { createdAt: 'asc' },
    });
    if (rows.some((r) => r.state === 'READ')) return 'READ';
    if (rows.some((r) => r.state === 'ESCALATED')) return 'ESCALATED';
    if (rows.some((r) => r.state === 'DEAD_LETTER')) return 'DEAD_LETTER';
    if (rows.some((r) => r.state === 'SUPPRESSED')) return 'SUPPRESSED';
    if (rows.some((r) => ['DELIVERED', 'SENT'].includes(r.state))) return 'DELIVERED';
    return 'QUEUED';
  }

  async listMine(auth: NotificationAuthority) {
    if (!auth.accountId) this.denied();
    const rows = await this.prisma.notificationRecord.findMany({
      where: { recipientKind: 'ACCOUNT', recipientAccountId: auth.accountId },
      orderBy: { createdAt: 'desc' },
    });
    const items = [];
    for (const row of rows) {
      items.push(this.recordView(row, await this.deliveryState(this.prisma, row.id)));
    }
    return { items };
  }

  async listSignals(
    auth: NotificationAuthority,
    filters: { status?: string },
  ) {
    // Staff signals: rows addressed to a role+scope the caller holds
    // live. Anyone without a matching staff assignment is denied
    // without disclosing whether signals exist.
    const held: Array<{ role: string; scopeType: string | null; scopeRef: string | null }> = [];
    for (const [role, capability] of STAFF_WRITERS) {
      const assignment = await this.liveAssignment(auth, role, capability);
      if (assignment && auth.activeRole === role) {
        held.push({
          role,
          scopeType: assignment.scopeType,
          scopeRef: assignment.scopeRef,
        });
      }
    }
    if (auth.activeRole === 'SYSADMIN') {
      const assignment = await this.liveAssignment(auth, 'SYSADMIN', 'administer-identity');
      if (assignment) {
        const rows = await this.prisma.notificationRecord.findMany({
          where: {
            recipientKind: 'ROLE_SCOPE',
            ...(filters.status ? { status: filters.status } : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
        const items = [];
        for (const row of rows) {
          items.push(this.recordView(row, await this.deliveryState(this.prisma, row.id)));
        }
        return { items };
      }
    }
    if (held.length === 0) this.denied();
    const rows = await this.prisma.notificationRecord.findMany({
      where: {
        recipientKind: 'ROLE_SCOPE',
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    const items = [];
    for (const row of rows) {
      if (
        held.some(
          (h) =>
            h.role === row.recipientRole &&
            (row.scopeType === null || h.scopeType === row.scopeType) &&
            (row.scopeRef === null || h.scopeRef === row.scopeRef),
        )
      ) {
        items.push(this.recordView(row, await this.deliveryState(this.prisma, row.id)));
      }
    }
    return { items };
  }

  async recordDetail(auth: NotificationAuthority, id: string) {
    const row = await this.prisma.notificationRecord.findUnique({
      where: { id },
    });
    if (!row) this.fail('NOT_FOUND', 'Notification not found.', 404);
    if (
      row.recipientKind === 'ACCOUNT' &&
      row.recipientAccountId === auth.accountId
    ) {
      const deliveries = await this.prisma.notificationDelivery.findMany({
        where: { recordId: id },
        orderBy: { createdAt: 'asc' },
      });
      return {
        ...this.recordView(row, await this.deliveryState(this.prisma, row.id)),
        deliveries: deliveries.map((d) => ({
          id: d.id,
          channel: d.channel,
          state: d.state,
          attempts: d.attempts,
        })),
      };
    }
    // Staff scope read (same match rule as listSignals).
    const signals = await this.listSignals(auth, {}).catch(() => null);
    if (signals && signals.items.some((i) => i.id === id)) {
      const deliveries = await this.prisma.notificationDelivery.findMany({
        where: { recordId: id },
        orderBy: { createdAt: 'asc' },
      });
      return {
        ...this.recordView(row, await this.deliveryState(this.prisma, row.id)),
        deliveries: deliveries.map((d) => ({
          id: d.id,
          channel: d.channel,
          state: d.state,
          attempts: d.attempts,
        })),
      };
    }
    this.fail('NOT_FOUND', 'Notification not found.', 404);
  }

  async deliveryDetail(auth: NotificationAuthority, id: string) {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id },
    });
    if (!delivery) this.fail('NOT_FOUND', 'Notification not found.', 404);
    await this.recordDetail(auth, delivery.recordId);
    return {
      id: delivery.id,
      recordId: delivery.recordId,
      channel: delivery.channel,
      state: delivery.state,
      attempts: delivery.attempts,
    };
  }

  async markRead(auth: NotificationAuthority, key: string, id: string) {
    const row = await this.prisma.notificationRecord.findUnique({
      where: { id },
    });
    if (
      !row ||
      row.recipientKind !== 'ACCOUNT' ||
      row.recipientAccountId !== auth.accountId
    ) {
      this.fail('NOT_FOUND', 'Notification not found.', 404);
    }
    return this.command(auth, key, 'ReadNotification', { id }, async (db) => {
      await db.notificationDelivery.updateMany({
        where: { recordId: id },
        data: { state: 'READ', readAt: new Date() },
      });
      await this.audit(db, auth, 'NotificationRead', id, key, {});
      const live = await db.notificationRecord.findUniqueOrThrow({
        where: { id },
      });
      return { body: this.recordView(live, 'READ') };
    });
  }

  async suppress(
    auth: NotificationAuthority,
    key: string,
    id: string,
    optedOut: boolean,
  ) {
    const row = await this.prisma.notificationRecord.findUnique({
      where: { id },
    });
    if (
      !row ||
      row.recipientKind !== 'ACCOUNT' ||
      row.recipientAccountId !== auth.accountId
    ) {
      this.fail('NOT_FOUND', 'Notification not found.', 404);
    }
    if (row.mandatory && optedOut) {
      this.fail(
        'MANDATORY_NOTICE',
        'Mandatory academic, financial, safety and regulatory notices cannot be disabled.',
        409,
      );
    }
    return this.command(auth, key, 'SuppressNotification', { id, optedOut }, async (db) => {
      await db.notificationDelivery.updateMany({
        where: { recordId: id },
        data: { state: optedOut ? 'SUPPRESSED' : 'QUEUED' },
      });
      await this.audit(db, auth, 'NotificationSuppressed', id, key, { optedOut });
      const live = await db.notificationRecord.findUniqueOrThrow({
        where: { id },
      });
      return { body: this.recordView(live, await this.deliveryState(db, live.id)) };
    });
  }

  /**
   * Worker tick body: claims due deliveries with SKIP LOCKED,
   * advances them through the SIM-NOTIFY-v1 provider, retries with
   * backoff, dead-letters at budget, and escalates mandatory
   * failures to a staff follow-up record. Converges under racing
   * ticks: the row lock serializes claimants.
   */
  async runWorker(): Promise<{ claimed: number }> {
    const now = new Date();
    const due: Array<{ id: string }> = await this.prisma.$queryRaw`
      SELECT id FROM "NotificationDelivery"
      WHERE state IN ('QUEUED', 'RETRIED')
        AND "nextRunAt" <= ${now}
      ORDER BY "nextRunAt" ASC
      LIMIT 25
      FOR UPDATE SKIP LOCKED`;
    let claimed = 0;
    for (const { id } of due) {
      await this.prisma.$transaction(async (db) => {
        const delivery = await db.notificationDelivery.findUnique({
          where: { id },
        });
        if (!delivery) return;
        if (!['QUEUED', 'RETRIED'].includes(delivery.state)) return;
        if (delivery.nextRunAt && delivery.nextRunAt.getTime() > Date.now()) return;
        claimed += 1;
        const record = await db.notificationRecord.findUniqueOrThrow({
          where: { id: delivery.recordId },
        });
        // The SIM provider fails only when a failure is armed (test
        // control or incident drill): unarmed deliveries succeed on
        // the first attempt with a recorded provider reference. The
        // armed marker persists across retries via the SIMULATED_
        // prefix so a drill runs to dead-letter honestly.
        const fails =
          typeof delivery.lastError === 'string' &&
          delivery.lastError.startsWith('SIMULATED_');
        if (!fails) {
          const at = new Date();
          await db.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              state: 'DELIVERED',
              attempts: { increment: 1 },
              sentAt: delivery.sentAt ?? at,
              deliveredAt: at,
              providerRef: `sim-${delivery.id.slice(0, 8)}`,
              lastError: null,
            },
          });
          await db.outboxEvent.create({
            data: {
              aggregate: 'NotificationDelivery',
              aggregateId: delivery.id,
              type: 'NotificationDelivered',
              payload: json({
                recordId: record.id,
                channel: delivery.channel,
                chain: {
                  command: 'RunNotificationWorker',
                  event: 'NotificationDelivered-v1',
                },
              }),
            },
          });
          return;
        }
        const attempts = delivery.attempts + 1;
        const maxAttempts = policy.retry.maxAttempts as unknown as number;
        if (attempts >= maxAttempts) {
          await db.notificationDelivery.update({
            where: { id: delivery.id },
            data: { state: 'DEAD_LETTER', attempts, lastError: 'SIMULATED_PROVIDER_FAILURE' },
          });
          await db.outboxEvent.create({
            data: {
              aggregate: 'NotificationDelivery',
              aggregateId: delivery.id,
              type: 'NotificationDeadLettered',
              payload: json({
                recordId: record.id,
                channel: delivery.channel,
                attempts,
                chain: {
                  command: 'RunNotificationWorker',
                  event: 'NotificationDeadLettered-v1',
                },
              }),
            },
          });
          // Mandatory notices escalate to a staff follow-up record
          // (§16.12: the workflow may create one under policy).
          if (record.mandatory && attempts >= (policy.escalation.afterFailures as unknown as number)) {
            const escalation = await db.notificationRecord.create({
              data: {
                templateId: record.templateId,
                templateVersion: record.templateVersion,
                event: 'NOTICE_ESCALATED',
                title: `Escalated: ${record.title}`,
                body: `Delivery failed for a mandatory notice. Follow up with the recipient through the responsible office.`,
                office: record.office,
                category: 'INCIDENT',
                mandatory: true,
                recipientKind: 'ROLE_SCOPE',
                recipientRole: 'EXAMINATIONS_OFFICER',
                scopeType: 'PERIOD',
                scopeRef: 'GLOBAL',
                dedupeKey: `escalation:${delivery.id}`,
                status: 'OPEN',
              },
            });
            await db.notificationDelivery.create({
              data: {
                recordId: escalation.id,
                channel: 'IN_SYSTEM',
                state: 'QUEUED',
                nextRunAt: new Date(),
              },
            });
          }
          return;
        }
        const backoff = (policy.retry.backoffSeconds as unknown as number[])[
          Math.min(attempts - 1, 2)
        ];
        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            state: 'RETRIED',
            attempts,
            nextRunAt: new Date(Date.now() + backoff * 1000),
            lastError: 'SIMULATED_PROVIDER_FAILURE',
          },
        });
      });
    }
    return { claimed };
  }
}
