import { Injectable, HttpException } from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Prisma } from '@prisma/client';
import { policy } from './policy.provider.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

// Type for application row with included relations
interface ApplicationRow {
  id: string;
  reference: string;
  accountId: string;
  offering?: {
    id: string;
    intake: string;
    studyMode: string;
    campus: string;
    programme?: { id: string; name: string; code: string; rules: unknown[] };
  } | null;
  personal: {
    givenName?: string;
    familyName?: string;
    otherNames?: string;
    preferredName?: string;
    dateOfBirth?: string;
  } | null;
}

interface ReviewerAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

interface ReviewQueueCursorContext {
  version: 1;
  accountId: string;
  assignmentId: string;
  scopeType: string | null;
  scopeRef: string | null;
  queueScope: 'mine' | 'pool';
  state: string | null;
  actionNeeded: boolean | null;
  reference: string | null;
  sort: 'oldest' | 'newest';
}

interface ReviewQueueCursor extends ReviewQueueCursorContext {
  sortAt: string;
  lastId: string;
}

const queueApplicationSelect = {
  id: true,
  reference: true,
  state: true,
  version: true,
  submission: { select: { createdAt: true } },
  clarifications: {
    where: { status: 'OPEN' },
    select: { id: true },
  },
  correctionRequests: {
    where: { status: 'PENDING' },
    select: { id: true },
  },
} satisfies Prisma.ApplicationSelect;

const queueCursorDevelopmentSecret = 'sis-review-queue-cursor-development-only';

// Phase 3 slice 1: assigned admissions queue (TASK-PH3-001). Staff work only
// through claimed assignments; applicant records are never modified here.
// Claim/release are idempotent commands with version checks, mirroring the
// applicant case-write pattern. Fictional demo roles only (see packet).
@Injectable()
export class ReviewService {
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
          'Review the current review queue, or contact the admissions office.',
        ...extra,
      },
      status,
    );
  }

  private async gate(
    actor: ReviewerAuthority,
    mode: 'read' | 'write' = 'write',
  ): Promise<{
    scopeType: string | null;
    scopeRef: string | null;
    readOnly: boolean;
  }> {
    if (!actor.assignmentId) {
      throw new HttpException(
        { message: 'Select an admissions workspace to continue.' },
        403,
      );
    }
    const now = new Date();
    const live = {
      id: actor.assignmentId,
      accountId: actor.accountId,
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      account: { status: 'ACTIVE' },
    };
    const officer =
      actor.activeRole === 'ADMISSIONS_OFFICER'
        ? await this.prisma.roleAssignment.findFirst({
            where: {
              ...live,
              role: 'ADMISSIONS_OFFICER',
              capabilities: { has: 'review-assigned' },
            },
          })
        : null;
    if (officer) {
      return {
        scopeType: officer.scopeType,
        scopeRef: officer.scopeRef,
        readOnly: false,
      };
    }
    // Approvers read evidence ahead of slice 5 but never mutate review
    // state here; every write path gates mode 'write' and denies them.
    if (mode === 'read' && actor.activeRole === 'ADMISSIONS_APPROVER') {
      const approver = await this.prisma.roleAssignment.findFirst({
        where: {
          ...live,
          role: 'ADMISSIONS_APPROVER',
          capabilities: { has: 'decide-offer' },
        },
      });
      if (approver) {
        return {
          scopeType: approver.scopeType,
          scopeRef: approver.scopeRef,
          readOnly: true,
        };
      }
    }
    throw new HttpException(
      {
        message:
          mode === 'read'
            ? 'This admissions workspace is unavailable.'
            : 'Select an admissions reviewer workspace to continue.',
      },
      403,
    );
  }

  private checkVersion(row: { version: number }, expected: number): void {
    if (row.version !== expected) {
      this.fail(
        'VERSION_CONFLICT',
        'This application changed since it was reviewed. Reload the queue and try again with the current version.',
        409,
        { currentVersion: row.version },
      );
    }
  }

  private async audit(
    db: Tx,
    actor: ActiveAuthority,
    action: string,
    id: string,
    key: string,
    outcome = 'ALLOW',
    metadata: unknown = {},
  ) {
    await db.auditEvent.create({
      data: {
        action,
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole ?? 'ADMISSIONS_OFFICER',
        scope: `APPLICATION:${id}`,
        targetRef: id,
        outcome,
        correlationId: randomUUID(),
        idempotencyRef: key,
        policyVersion: policy.version,
        purpose: 'Admissions review',
        metadata: json(metadata),
      },
    });
  }

  private async event(
    db: Tx,
    applicationId: string,
    row: { code: string; label: string; detail?: string; visible?: boolean },
  ): Promise<void> {
    // Assignment and review activity stay staff-only unless the event is
    // applicant-facing (visibleTimeline filters applicantVisible=false).
    await db.applicationStatusEvent.create({
      data: {
        applicationId,
        code: row.code,
        label: row.label,
        detail: row.detail ?? null,
        actorRole: 'ADMISSIONS',
        applicantVisible: row.visible ?? false,
      },
    });
  }

  private async notify(
    db: Tx,
    accountId: string,
    applicationId: string | null,
    type: string,
    title: string,
    payload?: unknown,
  ): Promise<void> {
    // Applicant inbox projection only: neutral titles, never outcomes
    // (GAP-008/009 hold for the delivery worker).
    await db.applicantNotification.create({
      data: {
        accountId,
        applicationId,
        type,
        title,
        payload: payload === undefined ? undefined : json(payload),
      },
    });
  }

  // Reviewer-scoped idempotent command: account lock serializes concurrent
  // claim/release attempts; mismatched keys conflict instead of replaying.
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
                'This request reference belongs to a different action. Review the current queue state.',
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
              status: outcome.status ?? 200,
              response: json(outcome.body),
            },
          });
          return outcome;
        },
        { timeout: 20000 },
      );
      if ((result.status ?? 200) >= 400)
        throw new HttpException(result.body as object, result.status!);
      return result.body;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        action === 'ClaimReviewCase'
      ) {
        // Lost the claim race after the application-row lock: the partial
        // unique index admitted exactly one CLAIMED row.
        const target =
          typeof payload === 'object' &&
          payload !== null &&
          'applicationId' in payload &&
          typeof (payload as { applicationId?: unknown }).applicationId ===
            'string'
            ? (payload as { applicationId: string }).applicationId
            : 'review-queue';
        await this.audit(this.prisma, actor, action, target, key, 'DENY', {
          status: 409,
        }).catch(() => {});
        this.fail(
          'ASSIGNMENT_CONFLICT',
          'This case is already claimed by another reviewer.',
          409,
          { claimedByRole: 'ADMISSIONS' },
        );
      }
      if (error instanceof HttpException) {
        const target =
          typeof payload === 'object' &&
          payload !== null &&
          'applicationId' in payload &&
          typeof (payload as { applicationId?: unknown }).applicationId ===
            'string'
            ? (payload as { applicationId: string }).applicationId
            : 'review-queue';
        await this.audit(this.prisma, actor, action, target, key, 'DENY', {
          status: error.getStatus(),
        }).catch(() => {});
        throw error;
      }
      this.fail(
        'SERVICE_UNAVAILABLE',
        'The review service could not confirm this action. Check the queue state before retrying the same request.',
        503,
      );
    }
  }

  private inScope(
    scopeType: string | null,
    scopeRef: string | null,
    intake: string,
  ): boolean {
    // Interim intake-string matching until GAP-004 lands (see packet).
    // Fail-closed: only INTAKE scopes with a reference match anything.
    if (scopeType !== 'INTAKE' || !scopeRef) return false;
    return intake.startsWith(scopeRef);
  }

  private async bump(db: Tx, applicationId: string): Promise<void> {
    // Post-submit version: every review-relevant mutation (clarification,
    // correction, withdrawal, staff decision) advances it so stale reviewers
    // conflict instead of silently working old state.
    await db.application.update({
      where: { id: applicationId },
      data: { version: { increment: 1 } },
    });
  }

  private cursorSecret(): string {
    const configured = process.env.QUEUE_CURSOR_SECRET;
    if (
      process.env.NODE_ENV === 'production' &&
      (!configured || configured.length < 32)
    )
      this.fail(
        'QUEUE_UNAVAILABLE',
        'Queue navigation is temporarily unavailable. Contact the system administrator.',
        503,
      );
    return configured || queueCursorDevelopmentSecret;
  }

  private signCursor(encodedPayload: string): string {
    return createHmac('sha256', this.cursorSecret())
      .update(encodedPayload)
      .digest('base64url');
  }

  private encodeCursor(cursor: ReviewQueueCursor): string {
    const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
    return `${payload}.${this.signCursor(payload)}`;
  }

  private decodeCursor(
    token: string,
    expected: ReviewQueueCursorContext,
  ): ReviewQueueCursor {
    const invalid = () =>
      this.fail(
        'QUEUE_CURSOR_INVALID',
        'These queue results are no longer available. Restart from the first page.',
        400,
      );
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined) invalid();
    try {
      const actual = Buffer.from(signature, 'base64url');
      const wanted = Buffer.from(this.signCursor(payload), 'base64url');
      if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted))
        invalid();
      const parsed = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Partial<ReviewQueueCursor>;
      if (
        parsed.version !== expected.version ||
        parsed.accountId !== expected.accountId ||
        parsed.assignmentId !== expected.assignmentId ||
        parsed.scopeType !== expected.scopeType ||
        parsed.scopeRef !== expected.scopeRef ||
        parsed.queueScope !== expected.queueScope ||
        parsed.state !== expected.state ||
        parsed.actionNeeded !== expected.actionNeeded ||
        parsed.reference !== expected.reference ||
        parsed.sort !== expected.sort ||
        typeof parsed.sortAt !== 'string' ||
        Number.isNaN(Date.parse(parsed.sortAt)) ||
        typeof parsed.lastId !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(parsed.lastId)
      )
        invalid();
      return parsed as ReviewQueueCursor;
    } catch {
      return invalid();
    }
  }

  async queue(
    auth: ReviewerAuthority,
    scope: 'mine' | 'pool',
    state?: string,
    actionNeeded?: boolean,
    take = 50,
    cursorToken?: string,
    reference?: string,
    sort: 'oldest' | 'newest' = 'oldest',
  ) {
    const { scopeType, scopeRef } = await this.gate(auth, 'read');
    await this.audit(
      this.prisma,
      auth,
      'ReviewQueueViewed',
      scope,
      randomUUID(),
    ).catch(() => {});
    const limit = Math.min(Math.max(take, 1), 100);
    if (scopeType !== 'INTAKE' || !scopeRef)
      return { items: [], nextCursor: null, hasMore: false };

    const context: ReviewQueueCursorContext = {
      version: 1,
      accountId: auth.accountId,
      assignmentId: auth.assignmentId!,
      scopeType,
      scopeRef,
      queueScope: scope,
      state: state ?? null,
      actionNeeded: actionNeeded ?? null,
      reference: reference ?? null,
      sort,
    };
    const cursor = cursorToken ? this.decodeCursor(cursorToken, context) : null;
    const cursorDate = cursor ? new Date(cursor.sortAt) : null;
    const direction: Prisma.SortOrder = sort === 'newest' ? 'desc' : 'asc';
    const actionFilter: Prisma.ApplicationWhereInput[] =
      actionNeeded === true
        ? [
            {
              OR: [
                { clarifications: { some: { status: 'OPEN' } } },
                { correctionRequests: { some: { status: 'PENDING' } } },
              ],
            },
          ]
        : actionNeeded === false
          ? [
              { clarifications: { none: { status: 'OPEN' } } },
              { correctionRequests: { none: { status: 'PENDING' } } },
            ]
          : [];
    const applicationWhere: Prisma.ApplicationWhereInput = {
      ...(scope === 'pool'
        ? { state: state ?? 'Submitted' }
        : state
          ? { state }
          : {}),
      offering: { intake: { startsWith: scopeRef } },
      ...(reference
        ? { reference: { equals: reference, mode: 'insensitive' as const } }
        : {}),
      AND: actionFilter,
    };

    if (scope === 'mine') {
      const rows = await this.prisma.reviewAssignment.findMany({
        where: {
          assigneeAccountId: auth.accountId,
          status: 'CLAIMED',
          application: { is: applicationWhere },
          ...(cursor && cursorDate
            ? {
                OR:
                  sort === 'newest'
                    ? [
                        { claimedAt: { lt: cursorDate } },
                        {
                          claimedAt: cursorDate,
                          applicationId: { lt: cursor.lastId },
                        },
                      ]
                    : [
                        { claimedAt: { gt: cursorDate } },
                        {
                          claimedAt: cursorDate,
                          applicationId: { gt: cursor.lastId },
                        },
                      ],
              }
            : {}),
        },
        select: {
          claimedAt: true,
          application: { select: queueApplicationSelect },
        },
        orderBy: [{ claimedAt: direction }, { applicationId: direction }],
        take: limit + 1,
      });
      const page = rows.slice(0, limit);
      const hasMore = rows.length > limit;
      const last = page.at(-1);
      return {
        items: page.map((row) => this.item(row.application, row.claimedAt)),
        nextCursor:
          hasMore && last
            ? this.encodeCursor({
                ...context,
                sortAt: last.claimedAt.toISOString(),
                lastId: last.application.id,
              })
            : null,
        hasMore,
      };
    }

    const where: Prisma.ApplicationWhereInput = {
      ...applicationWhere,
      reviewAssignments: { none: { status: 'CLAIMED' } },
      ...(cursor && cursorDate
        ? {
            OR:
              sort === 'newest'
                ? [
                    { createdAt: { lt: cursorDate } },
                    { createdAt: cursorDate, id: { lt: cursor.lastId } },
                  ]
                : [
                    { createdAt: { gt: cursorDate } },
                    { createdAt: cursorDate, id: { gt: cursor.lastId } },
                  ],
          }
        : {}),
    };
    const rows = await this.prisma.application.findMany({
      where,
      select: { ...queueApplicationSelect, createdAt: true },
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = page.at(-1);
    return {
      items: page.map((row) => this.item(row, null)),
      nextCursor:
        hasMore && last
          ? this.encodeCursor({
              ...context,
              sortAt: last.createdAt.toISOString(),
              lastId: last.id,
            })
          : null,
      hasMore,
    };
  }

  async preparation(
    auth: ReviewerAuthority,
    items: Array<{ applicationId: string; version: number }>,
  ) {
    // This is a read-only inventory, but the write-mode gate intentionally
    // restricts it to active officers rather than read-only approvers.
    const { scopeType, scopeRef } = await this.gate(auth);
    if (
      !items.length ||
      items.length > 50 ||
      new Set(items.map((item) => item.applicationId)).size !== items.length
    )
      this.fail(
        'INVALID_SELECTION',
        'Select between 1 and 50 different cases.',
        400,
      );

    const rows =
      scopeType === 'INTAKE' && scopeRef
        ? await this.prisma.reviewAssignment.findMany({
            where: {
              applicationId: { in: items.map((item) => item.applicationId) },
              assigneeAccountId: auth.accountId,
              status: 'CLAIMED',
              application: {
                is: {
                  state: 'Submitted',
                  offering: { intake: { startsWith: scopeRef } },
                },
              },
            },
            select: {
              applicationId: true,
              application: {
                select: {
                  reference: true,
                  version: true,
                  documents: {
                    where: { replacedBy: null },
                    select: { status: true },
                  },
                  clarifications: {
                    where: { status: 'OPEN' },
                    select: { id: true },
                  },
                  correctionRequests: {
                    where: { status: 'PENDING' },
                    select: { id: true },
                  },
                },
              },
            },
          })
        : [];
    const assigned = new Map(
      rows.map((row) => [row.applicationId, row.application]),
    );
    const preview = items.map(({ applicationId, version }) => {
      const row = assigned.get(applicationId);
      if (!row) return { applicationId, state: 'UNAVAILABLE' as const };
      if (row.version !== version)
        return { applicationId, state: 'CHANGED' as const };
      return {
        applicationId,
        state: 'CURRENT' as const,
        reference: row.reference,
        version: row.version,
        documents: {
          current: row.documents.length,
          awaitingQualityCheck: row.documents.filter(
            (document) => document.status === 'AwaitingQualityCheck',
          ).length,
          securityScanPending: row.documents.filter(
            (document) => document.status === 'SecurityScanPending',
          ).length,
        },
        openClarifications: row.clarifications.length,
        openCorrections: row.correctionRequests.length,
      };
    });
    await this.audit(
      this.prisma,
      auth,
      'ReviewPreparationPreviewed',
      `COUNT:${items.length}`,
      randomUUID(),
      'ALLOW',
      {
        selectedCount: items.length,
        currentCount: preview.filter((item) => item.state === 'CURRENT').length,
      },
    );
    return { items: preview, generatedAt: new Date().toISOString() };
  }

  private item(
    a: {
      id: string;
      reference: string;
      state: string;
      version: number;
      submission: { createdAt: Date } | null;
      clarifications: unknown[];
      correctionRequests: unknown[];
    },
    claimedAt: Date | null,
  ) {
    const actionNeeded =
      a.clarifications.length > 0 || a.correctionRequests.length > 0;
    return {
      applicationId: a.id,
      reference: a.reference,
      state: a.state,
      version: a.version,
      submittedAt: a.submission ? a.submission.createdAt.toISOString() : null,
      claimedAt: claimedAt ? claimedAt.toISOString() : null,
      openClarifications: a.clarifications.length,
      openCorrections: a.correctionRequests.length,
      actionNeeded,
    };
  }

  private async assigned(
    db: Tx,
    auth: ReviewerAuthority,
    id: string,
    scope: { scopeType: string | null; scopeRef: string | null },
  ) {
    const assignment = await db.reviewAssignment.findFirst({
      where: {
        applicationId: id,
        assigneeAccountId: auth.accountId,
        status: 'CLAIMED',
      },
      include: {
        application: {
          include: {
            offering: { include: { programme: true } },
            submission: true,
            documents: { orderBy: { createdAt: 'asc' } },
            clarifications: { orderBy: { askedAt: 'desc' } },
            correctionRequests: { orderBy: { createdAt: 'desc' } },
            recommendations: { orderBy: { version: 'desc' } },
            decision: true,
          },
        },
      },
    });
    // Neutral: unclaimed, another reviewer's claim, out-of-scope intake, and
    // unknown ids look identical, so staffing is never disclosed.
    if (
      !assignment ||
      !this.inScope(
        scope.scopeType,
        scope.scopeRef,
        assignment.application.offering.intake,
      )
    )
      this.fail('NOT_FOUND', 'Review case not found.', 404);
    return assignment;
  }

  // Approver preview (slice-5 probe): read-only load without a claim.
  private async approverView(db: Tx, id: string) {
    const row = await db.application.findFirst({
      where: { id },
      include: {
        offering: { include: { programme: true } },
        submission: true,
        documents: { orderBy: { createdAt: 'asc' } },
        clarifications: { orderBy: { askedAt: 'desc' } },
        correctionRequests: { orderBy: { createdAt: 'desc' } },
        recommendations: { orderBy: { version: 'desc' } },
        decision: true,
      },
    });
    if (!row) this.fail('NOT_FOUND', 'Review case not found.', 404);
    return row;
  }

  async evidence(auth: ReviewerAuthority, id: string) {
    const scope = await this.gate(auth, 'read');
    const a = scope.readOnly
      ? await this.approverView(this.prisma, id)
      : (await this.assigned(this.prisma, auth, id, scope)).application;
    await this.audit(
      this.prisma,
      auth,
      'ReviewEvidenceViewed',
      id,
      `evidence:${a.version}`,
    );
    return {
      applicationId: a.id,
      reference: a.reference,
      state: a.state,
      version: a.version,
      policyVersion: a.policyVersion,
      requirementVersion: a.requirementVersion,
      offering: {
        programmeCode: a.offering.programme.code,
        programmeName: a.offering.programme.name,
        intake: a.offering.intake,
      },
      // Declared sections as submitted; verification happens in later work.
      personal: a.personal,
      contact: a.contact,
      qualifications: a.qualifications,
      submission: a.submission
        ? {
            reference: a.submission.reference,
            createdAt: a.submission.createdAt.toISOString(),
          }
        : null,
      // State-only file rows: bytes are never embedded in projections, and
      // quarantined/failed files are not previewable.
      documents: a.documents.map((d) => ({
        id: d.id,
        category: d.category,
        fileName: d.fileName,
        mimeType: d.mimeType,
        size: d.size,
        status: d.status,
        scanner: d.scanner,
        version: d.version,
        replacesId: d.replacesId,
        replacementReason: d.replacementReason,
        createdAt: d.createdAt.toISOString(),
        canPreview: d.status === 'AwaitingQualityCheck',
      })),
      openClarifications: a.clarifications.filter((c) => c.status === 'OPEN')
        .length,
      openCorrections: a.correctionRequests.filter(
        (c) => c.status === 'PENDING',
      ).length,
      pendingCorrections: a.correctionRequests
        .filter((c) => c.status === 'PENDING')
        .map((c) => ({
          id: c.id,
          section: c.section,
          field: c.field,
          reason: c.reason,
          createdAt: c.createdAt.toISOString(),
        })),
      // Active recommendation only; history via the recommendations listing.
      // Staff-only like findings: never projected to applicant views.
      recommendation: (() => {
        const active = a.recommendations.find((r) => r.status === 'ACTIVE');
        return active ? this.toRecommendation(active) : null;
      })(),
      // Presence only: outcome/message/conditions stay out until slice 5.
      hasDecision: !!a.decision?.releasedAt,
    };
  }

  async listFindings(auth: ReviewerAuthority, id: string) {
    const scope = await this.gate(auth, 'read');
    if (scope.readOnly) await this.approverView(this.prisma, id);
    else await this.assigned(this.prisma, auth, id, scope);
    await this.audit(
      this.prisma,
      auth,
      'ReviewFindingsViewed',
      id,
      randomUUID(),
    ).catch(() => {});
    const rows = await this.prisma.reviewFinding.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        subject: r.subject,
        detail: r.detail,
        severity: r.severity,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async recordFinding(
    auth: ReviewerAuthority,
    applicationId: string,
    key: string,
    version: number,
    finding: {
      kind: string;
      subject: string;
      detail: string;
      severity: string;
    },
  ): Promise<{ id: string; status: string }> {
    await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      'RecordReviewFinding',
      { applicationId, version, ...finding },
      async (db) => {
        const scope = await this.gate(auth);
        const assignment = await this.assigned(db, auth, applicationId, scope);
        if (!finding.subject.trim() || !finding.detail.trim()) {
          this.fail(
            'EMPTY_FINDING',
            'Give the finding a subject and detail before recording.',
            400,
          );
        }
        const open = await db.reviewFinding.findFirst({
          where: {
            applicationId,
            kind: finding.kind,
            subject: finding.subject.trim(),
            status: 'OPEN',
          },
        });
        if (open) {
          this.fail(
            'DUPLICATE_TASK',
            'An open finding already covers this item. Record a new finding only for a new observation.',
            409,
            { findingId: open.id },
          );
        }
        this.checkVersion(assignment.application, version);
        const created = await db.reviewFinding.create({
          data: {
            applicationId,
            kind: finding.kind,
            subject: finding.subject.trim(),
            detail: finding.detail.trim(),
            severity: finding.severity,
            status: 'OPEN',
            createdByAccountId: auth.accountId,
          },
        });
        await this.audit(
          db,
          auth,
          'ReviewFindingRecorded',
          applicationId,
          key,
          'ALLOW',
          {
            findingId: created.id,
            kind: finding.kind,
          },
        );
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result as { id: string; status: string };
  }

  async raiseClarification(
    auth: ReviewerAuthority,
    applicationId: string,
    key: string,
    version: number,
    question: string,
    deadlineDays?: number,
  ): Promise<{ id: string; status: string }> {
    await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      'RequestApplicationClarification',
      { applicationId, version, question, deadlineDays },
      async (db) => {
        const scope = await this.gate(auth);
        const assignment = await this.assigned(db, auth, applicationId, scope);
        const row = assignment.application;
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_SUBMITTED',
            'Clarification needs a submitted application.',
          );
        }
        if (!question.trim()) {
          this.fail(
            'EMPTY_QUESTION',
            'Write the exact items needed before raising the request.',
            400,
          );
        }
        const days =
          deadlineDays ??
          (policy as { case?: { clarificationResponseDays: number } }).case
            ?.clarificationResponseDays ??
          14;
        const open = await db.applicationClarification.findFirst({
          where: { applicationId, question: question.trim(), status: 'OPEN' },
        });
        if (open) {
          this.fail(
            'DUPLICATE_TASK',
            'An open clarification already asks this. Direct the applicant to the open task instead of repeating it.',
            409,
            { clarificationId: open.id },
          );
        }
        this.checkVersion(row, version);
        // All writes join the outer command transaction directly: no nested
        // transaction, so clarification, event, notification, audit, version
        // bump and idempotency record commit or roll back together.
        const clar = await db.applicationClarification.create({
          data: {
            applicationId,
            question: question.trim(),
            deadline: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
            status: 'OPEN',
            askedBy: 'ADMISSIONS',
          },
        });
        await this.event(db, applicationId, {
          code: 'ClarificationRequired',
          label: 'Action needed: provide information',
          detail: question.trim(),
          visible: true,
        });
        await this.notify(
          db,
          row.accountId,
          applicationId,
          'CLARIFICATION_REQUEST',
          'Action needed on your application',
          { applicationId, clarificationId: clar.id },
        );
        await this.audit(
          db,
          auth,
          'ApplicationClarificationRequested',
          applicationId,
          key,
        );
        await this.bump(db, applicationId);

        // Emit OutboxEvent for notification delivery
        const correlationId = randomUUID();
        const applicantName = `${(row.personal as ApplicationRow['personal'])?.givenName ?? ''} ${(row.personal as ApplicationRow['personal'])?.familyName ?? ''}`;
        const programmeName = row.offering?.programme?.name ?? '';
        await db.outboxEvent.create({
          data: {
            aggregate: 'Application',
            aggregateId: applicationId,
            type: 'ApplicationClarificationRequested',
            payload: json({
              applicationId,
              clarificationId: clar.id,
              clarificationQuestion: question.trim(),
              deadline: new Date(
                Date.now() + days * 24 * 60 * 60 * 1000,
              ).toISOString(),
              applicantName,
              reference: row.reference,
              programmeName,
              recipientAccountId: row.accountId,
              templateKey: 'CLARIFICATION_REQUESTED',
              templateVars: {
                applicantName,
                reference: row.reference,
                programmeName,
                clarificationQuestion: question.trim(),
                deadline: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0],
              },
              channels: ['email', 'internal'],
              correlationId,
              idempotencyKey: key,
            }),
          },
        });

        return { body: { id: clar.id, status: clar.status } };
      },
    );
    return result as { id: string; status: string };
  }

  private async applyCorrectionDecision(
    db: Tx,
    actor: ActiveAuthority,
    applicationId: string,
    correction: { id: string; status: string },
    approve: boolean,
    note: string | undefined,
    key: string,
    auditAction: string,
  ) {
    if (correction.status !== 'PENDING') {
      this.fail(
        'REQUEST_CLOSED',
        'This correction request is already decided.',
        409,
      );
    }
    const app = await db.application.findFirst({
      where: { id: applicationId },
      include: { offering: true },
    });
    if (!app || app.state !== 'Submitted') {
      this.fail(
        'NOT_SUBMITTED',
        'Correction decisions need a submitted application awaiting review.',
      );
    }
    const status = approve ? 'APPROVED' : 'REJECTED';
    const decided = await db.applicationCorrectionRequest.update({
      where: { id: correction.id },
      data: { status, decidedAt: new Date() },
    });
    await this.event(db, applicationId, {
      code: approve ? 'AmendmentApproved' : 'AmendmentDeclined',
      label: approve ? 'Correction approved' : 'Correction not approved',
      visible: true,
      detail: note?.trim()
        ? note.trim()
        : approve
          ? 'Admissions approved the correction request. The submitted snapshot stays unchanged in this demonstration.'
          : 'Admissions did not approve the correction request. The submitted application is unchanged.',
    });
    await this.bump(db, applicationId);
    await this.notify(
      db,
      app.accountId,
      applicationId,
      approve ? 'CORRECTION_APPROVED' : 'CORRECTION_DECLINED',
      'Update on your correction request. Sign in to view it securely.',
      { applicationId, correctionId: correction.id, status },
    );
    await this.audit(db, actor, auditAction, applicationId, key);
    return { id: decided.id, status: decided.status };
  }

  async decideCorrection(
    auth: ReviewerAuthority,
    correctionId: string,
    key: string,
    approve: boolean,
    note?: string,
  ): Promise<{ id: string; status: string }> {
    await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      approve ? 'ApproveApplicationAmendment' : 'DeclineApplicationAmendment',
      { correctionId, approve, note },
      async (db) => {
        const correction = await db.applicationCorrectionRequest.findFirst({
          where: { id: correctionId },
        });
        if (!correction)
          this.fail('NOT_FOUND', 'Correction request not found.', 404);
        // Officer authority comes from the claim on the parent application.
        const scope = await this.gate(auth);
        await this.assigned(db, auth, correction.applicationId, scope);
        const body = await this.applyCorrectionDecision(
          db,
          auth,
          correction.applicationId,
          correction,
          approve,
          note,
          key,
          approve
            ? 'ApplicationAmendmentApproved'
            : 'ApplicationAmendmentDeclined',
        );
        return { body };
      },
    );
    return result as { id: string; status: string };
  }

  private toRecommendation(row: {
    id: string;
    applicationId: string;
    version: number;
    eligibilityOutcome: string;
    recommendation: string;
    criteriaVersion: string;
    criteria: unknown;
    rationale: string;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      applicationId: row.applicationId,
      version: row.version,
      eligibilityOutcome: row.eligibilityOutcome,
      recommendation: row.recommendation,
      criteriaVersion: row.criteriaVersion,
      criteria: Array.isArray(row.criteria) ? (row.criteria as string[]) : [],
      rationale: row.rationale,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listRecommendations(auth: ReviewerAuthority, id: string) {
    const scope = await this.gate(auth, 'read');
    if (scope.readOnly) await this.approverView(this.prisma, id);
    else await this.assigned(this.prisma, auth, id, scope);
    const rows = await this.prisma.reviewRecommendation.findMany({
      where: { applicationId: id },
      orderBy: { version: 'desc' },
    });
    return { items: rows.map((r) => this.toRecommendation(r)) };
  }

  async recordRecommendation(
    auth: ReviewerAuthority,
    applicationId: string,
    key: string,
    version: number,
    input: {
      eligibilityOutcome: string;
      recommendation: string;
      criteria?: string[];
      rationale: string;
      supersedesId?: string;
    },
  ): Promise<{ id: string; status: string; version: number }> {
    await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      'RecordApplicationRecommendation',
      { applicationId, version, ...input },
      async (db) => {
        const scope = await this.gate(auth);
        const assignment = await this.assigned(db, auth, applicationId, scope);
        const row = assignment.application;
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_SUBMITTED',
            'Recommendations need a submitted application awaiting review.',
          );
        }
        if (!input.rationale.trim()) {
          this.fail(
            'EMPTY_RATIONALE',
            'Record why this recommendation follows from the evidence.',
            400,
          );
        }
        const reviewPolicy = policy.review;
        const allowed = reviewPolicy?.criteria?.map((c) => c.key) ?? [];
        for (const criterion of input.criteria ?? []) {
          if (!allowed.includes(criterion)) {
            this.fail(
              'UNKNOWN_CRITERION',
              `Criterion ${criterion} is not part of ${reviewPolicy?.criteriaVersion ?? 'unknown'}.`,
              400,
            );
          }
        }
        const active = await db.reviewRecommendation.findFirst({
          where: { applicationId, status: 'ACTIVE' },
        });
        if (active && !input.supersedesId) {
          this.fail(
            'DUPLICATE_TASK',
            'An active recommendation already exists. Supersede it explicitly with its id for a new version.',
            409,
            { recommendationId: active.id },
          );
        }
        if (input.supersedesId) {
          if (!active || active.id !== input.supersedesId) {
            this.fail(
              'STALE_PACKAGE',
              'The active recommendation changed since it was reviewed. Reload and supersede the current version.',
              409,
            );
          }
        }
        this.checkVersion(row, version);
        const nextVersion = active ? active.version + 1 : 1;
        if (active) {
          await db.reviewRecommendation.update({
            where: { id: active.id },
            data: { status: 'SUPERSEDED', decidedAt: new Date() },
          });
        }
        const created = await db.reviewRecommendation.create({
          data: {
            applicationId,
            version: nextVersion,
            eligibilityOutcome: input.eligibilityOutcome,
            recommendation: input.recommendation,
            criteriaVersion:
              (policy.review as { criteriaVersion?: string } | undefined)
                ?.criteriaVersion ?? '',
            criteria:
              input.criteria === undefined ? undefined : json(input.criteria),
            rationale: input.rationale.trim(),
            status: 'ACTIVE',
            createdByAccountId: auth.accountId,
          },
        });
        await this.event(db, applicationId, {
          code: 'RecommendationRecorded',
          label: 'Review recommendation recorded',
        });
        await this.bump(db, applicationId);
        await this.audit(
          db,
          auth,
          'ApplicationRecommendationRecorded',
          applicationId,
          key,
          'ALLOW',
          {
            recommendationId: created.id,
            version: nextVersion,
            eligibilityOutcome: input.eligibilityOutcome,
          },
        );
        return {
          body: {
            id: created.id,
            status: created.status,
            version: created.version,
          },
        };
      },
    );
    return result as { id: string; status: string; version: number };
  }

  async releaseDecision(
    auth: ReviewerAuthority,
    applicationId: string,
    key: string,
    version: number,
    input: {
      outcome: string;
      message: string;
      acceptBy: string;
      conditions: Array<{
        text: string;
        detail?: string;
        owner: string;
        deadline?: string;
        blocksMatriculation?: boolean;
      }>;
    },
  ): Promise<{ id: string; outcome: string; version: number }> {
    // Approver-only gate runs before any record lookup, so denied roles
    // learn nothing about the application.
    const pre = await this.gate(auth, 'read');
    if (!pre.readOnly || auth.activeRole !== 'ADMISSIONS_APPROVER') {
      this.fail(
        'FORBIDDEN',
        'Decision release needs an admissions approver workspace.',
        403,
      );
    }
    const result = await this.command(
      auth,
      key,
      'ReleaseAdmissionDecision',
      { applicationId, version, ...input },
      async (db) => {
        const row = await this.approverView(db, applicationId);
        if (!this.inScope(pre.scopeType, pre.scopeRef, row.offering.intake))
          this.fail('NOT_FOUND', 'Review case not found.', 404);
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_SUBMITTED',
            'Decisions release only for submitted applications.',
          );
        }
        const existing = await db.applicationDecision.findUnique({
          where: { applicationId },
        });
        if (existing?.releasedAt) {
          this.fail(
            'ALREADY_RELEASED',
            'A decision is already released for this application.',
            409,
            { decisionId: existing.id },
          );
        }
        const pkg = await db.reviewRecommendation.findFirst({
          where: { applicationId, status: 'ACTIVE' },
        });
        if (!pkg) {
          this.fail(
            'NO_RECOMMENDATION',
            'Record a recommendation package before releasing a decision.',
            409,
          );
        }
        if (pkg.createdByAccountId === auth.accountId) {
          this.fail(
            'SELF_APPROVAL',
            'The recommending officer cannot release this decision. A separate approver is required.',
            403,
          );
        }
        this.checkVersion(row, version);
        const conditions = input.conditions.map((c) => ({
          text: c.text.trim(),
          detail: c.detail?.trim() ? c.detail.trim() : null,
          owner: c.owner,
          deadline: c.deadline ?? null,
          blocksMatriculation: c.blocksMatriculation === true,
        }));
        const decision = await db.applicationDecision.create({
          data: {
            applicationId,
            outcome: input.outcome,
            message: input.message.trim(),
            conditions: conditions as unknown as Prisma.InputJsonValue,
            version: 1,
            acceptBy: new Date(input.acceptBy),
            decidedAt: new Date(),
            releasedAt: new Date(),
          },
        });
        await db.applicationDecisionRevision.create({
          data: {
            decisionId: decision.id,
            version: decision.version,
            outcome: decision.outcome,
            message: decision.message,
            conditions: decision.conditions as Prisma.InputJsonValue,
            acceptBy: decision.acceptBy,
            reason: 'INITIAL_RELEASE',
            actorAccountId: auth.accountId,
          },
        });
        const offered =
          input.outcome === 'ADMIT' ||
          input.outcome === 'ADMIT_WITH_CONDITIONS';
        await this.event(db, applicationId, {
          code: offered ? 'Offered' : 'DecisionReleased',
          label: offered
            ? 'Admission offer available'
            : 'Admission decision available',
          detail: 'Sign in to view the decision securely.',
          visible: true,
        });
        await this.notify(
          db,
          row.accountId,
          applicationId,
          'DECISION_RELEASED',
          'An admission decision is available for your application. Sign in to view it securely.',
          { applicationId, decisionId: decision.id },
        );
        await this.bump(db, applicationId);
        await this.audit(
          db,
          auth,
          'AdmissionDecisionReleased',
          applicationId,
          key,
          'ALLOW',
          {
            decisionId: decision.id,
            outcome: input.outcome,
            version: 1,
            recommendationId: pkg.id,
            criteriaVersion: pkg.criteriaVersion,
          },
        );

        // Emit OutboxEvent for ApplicationDecisionReleased
        const correlationId = randomUUID();
        const applicantName = `${(row.personal as ApplicationRow['personal'])?.givenName ?? ''} ${(row.personal as ApplicationRow['personal'])?.familyName ?? ''}`;
        const programmeName = row.offering?.programme?.name ?? '';
        await db.outboxEvent.create({
          data: {
            aggregate: 'Application',
            aggregateId: applicationId,
            type: 'ApplicationDecisionReleased',
            payload: json({
              applicationId,
              decisionId: decision.id,
              outcome: input.outcome,
              message: input.message.trim(),
              acceptBy: input.acceptBy,
              conditions: conditions.map((c) => c.text).join('; '),
              applicantName,
              reference: row.reference,
              programmeName,
              recipientAccountId: row.accountId,
              templateKey: 'DECISION_RELEASED',
              templateVars: {
                applicantName,
                reference: row.reference,
                programmeName,
                outcome: input.outcome,
                message: input.message.trim(),
                acceptBy: new Date(input.acceptBy).toISOString().split('T')[0],
              },
              channels: ['email', 'internal'],
              correlationId,
              idempotencyKey: key,
            }),
          },
        });

        // Emit OutboxEvent for ApplicationOfferReleased if outcome is ADMIT or ADMIT_WITH_CONDITIONS
        if (offered) {
          const applicantName = `${(row.personal as ApplicationRow['personal'])?.givenName ?? ''} ${(row.personal as ApplicationRow['personal'])?.familyName ?? ''}`;
          const programmeName = row.offering?.programme?.name ?? '';
          await db.outboxEvent.create({
            data: {
              aggregate: 'Application',
              aggregateId: applicationId,
              type: 'ApplicationOfferReleased',
              payload: json({
                applicationId,
                decisionId: decision.id,
                outcome: input.outcome,
                acceptBy: input.acceptBy,
                intake: row.offering?.intake ?? '',
                studyMode: row.offering?.studyMode ?? '',
                campus: row.offering?.campus ?? '',
                conditions: conditions.map((c) => c.text).join('; '),
                applicantName,
                reference: row.reference,
                programmeName,
                recipientAccountId: row.accountId,
                templateKey: 'OFFER_RELEASED',
                templateVars: {
                  applicantName,
                  reference: row.reference,
                  programmeName,
                  intake: row.offering?.intake ?? '',
                  studyMode: row.offering?.studyMode ?? '',
                  campus: row.offering?.campus ?? '',
                  acceptBy: new Date(input.acceptBy)
                    .toISOString()
                    .split('T')[0],
                },
                channels: ['email', 'internal'],
                correlationId: randomUUID(),
                idempotencyKey: key,
              }),
            },
          });
        }

        return {
          body: {
            id: decision.id,
            outcome: decision.outcome,
            version: decision.version,
          },
        };
      },
    );
    return result as { id: string; outcome: string; version: number };
  }

  async extendOffer(
    auth: ReviewerAuthority,
    applicationId: string,
    key: string,
    version: number,
    newDeadline: string,
    reason: string,
  ): Promise<{ applicationId: string; acceptBy: string }> {
    const pre = await this.gate(auth, 'read');
    if (!pre.readOnly || auth.activeRole !== 'ADMISSIONS_APPROVER') {
      this.fail(
        'FORBIDDEN',
        'Offer extensions need an admissions approver workspace.',
        403,
      );
    }
    const result = await this.command(
      auth,
      key,
      'ExtendAdmissionOffer',
      { applicationId, version, newDeadline, reason },
      async (db) => {
        const row = await this.approverView(db, applicationId);
        if (!this.inScope(pre.scopeType, pre.scopeRef, row.offering.intake))
          this.fail('NOT_FOUND', 'Review case not found.', 404);
        const decision = await db.applicationDecision.findUnique({
          where: { applicationId },
        });
        if (!decision || !decision.releasedAt) {
          this.fail(
            'NOTHING_TO_EXTEND',
            'There is no released offer to extend.',
            404,
          );
        }
        if (
          decision.outcome !== 'ADMIT' &&
          decision.outcome !== 'ADMIT_WITH_CONDITIONS'
        ) {
          this.fail(
            'OFFER_NOT_AVAILABLE',
            'Only a released admission offer can be extended.',
            404,
          );
        }
        const answered = await db.applicationOfferResponse.findUnique({
          where: { applicationId },
        });
        if (answered) {
          this.fail(
            'ALREADY_ANSWERED',
            'This offer already has a recorded response.',
            409,
            { decision: answered.decision },
          );
        }
        if (new Date(newDeadline).getTime() <= Date.now()) {
          this.fail(
            'INVALID_DEADLINE',
            'The new deadline must be in the future.',
            400,
          );
        }
        if (!reason.trim()) {
          this.fail(
            'EMPTY_REASON',
            'Record why the extension is authorized.',
            400,
          );
        }
        this.checkVersion(row, version);
        if (new Date(newDeadline) <= (decision.acceptBy ?? new Date(0))) {
          this.fail(
            'INVALID_DEADLINE',
            'The extension must move the deadline later.',
            400,
          );
        }
        const updated = await db.applicationDecision.update({
          where: { applicationId },
          data: { acceptBy: new Date(newDeadline), version: { increment: 1 } },
        });
        await db.applicationDecisionRevision.create({
          data: {
            decisionId: updated.id,
            version: updated.version,
            outcome: updated.outcome,
            message: updated.message,
            conditions: updated.conditions as Prisma.InputJsonValue,
            acceptBy: updated.acceptBy,
            reason: reason.trim(),
            actorAccountId: auth.accountId,
          },
        });
        await this.event(db, applicationId, {
          code: 'OfferExtended',
          label: 'Offer deadline extended',
          detail: 'The response deadline moved under an authorized extension.',
          visible: true,
        });
        await this.notify(
          db,
          row.accountId,
          applicationId,
          'OFFER_EXTENDED',
          'Update on your admission offer. Sign in to view it securely.',
          { applicationId },
        );
        await this.bump(db, applicationId);
        await this.audit(
          db,
          auth,
          'AdmissionOfferExtended',
          applicationId,
          key,
          'ALLOW',
          {
            acceptBy: updated.acceptBy?.toISOString(),
            reason: reason.trim(),
            version: updated.version,
            priorDeadline: decision.acceptBy?.toISOString(),
          },
        );

        // Emit OutboxEvent for ApplicationOfferReleased (updated offer)
        await db.outboxEvent.create({
          data: {
            aggregate: 'Application',
            aggregateId: applicationId,
            type: 'ApplicationOfferReleased',
            payload: json({
              applicationId,
              decisionId: decision.id,
              outcome: decision.outcome,
              acceptBy: newDeadline,
              intake: row.offering?.intake ?? '',
              studyMode: row.offering?.studyMode ?? '',
              campus: row.offering?.campus ?? '',
              conditions:
                (decision.conditions as unknown as Array<{ text: string }>)
                  ?.map((c) => c.text)
                  .join('; ') ?? '',
              applicantName: `${(row.personal as ApplicationRow['personal'])?.givenName ?? ''} ${(row.personal as ApplicationRow['personal'])?.familyName ?? ''}`,
              reference: row.reference,
              programmeName: row.offering?.programme?.name ?? '',
              recipientAccountId: row.accountId,
              templateKey: 'OFFER_RELEASED',
              templateVars: {
                applicantName: `${(row.personal as ApplicationRow['personal'])?.givenName ?? ''} ${(row.personal as ApplicationRow['personal'])?.familyName ?? ''}`,
                reference: row.reference,
                programmeName: row.offering?.programme?.name ?? '',
                intake: row.offering?.intake ?? '',
                studyMode: row.offering?.studyMode ?? '',
                campus: row.offering?.campus ?? '',
                acceptBy: new Date(newDeadline).toISOString().split('T')[0],
              },
              channels: ['email', 'internal'],
              correlationId: randomUUID(),
              idempotencyKey: key,
            }),
          },
        });

        return {
          body: {
            applicationId,
            acceptBy: (updated.acceptBy as Date).toISOString(),
          },
        };
      },
    );
    return result as { applicationId: string; acceptBy: string };
  }

  async caseHistory(auth: ReviewerAuthority, id: string) {
    // Staff-only timeline (UI-TIMELINE-001): the assigned officer or a
    // reader with approver scope sees every event, newest first, including
    // staff-only rows the applicant never sees. Unknown and foreign ids
    // stay neutral through the same gates as evidence.
    const scope = await this.gate(auth, 'read');
    if (scope.readOnly) await this.approverView(this.prisma, id);
    else await this.assigned(this.prisma, auth, id, scope);
    await this.audit(
      this.prisma,
      auth,
      'ReviewHistoryViewed',
      id,
      randomUUID(),
    ).catch(() => {});
    const rows = await this.prisma.applicationStatusEvent.findMany({
      where: { applicationId: id },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        code: r.code,
        label: r.label,
        detail: r.detail,
        actorRole: r.actorRole,
        applicantVisible: r.applicantVisible,
        occurredAt: r.occurredAt.toISOString(),
      })),
    };
  }

  async summary(auth: ReviewerAuthority, id: string) {
    const scope = await this.gate(auth, 'read');
    await this.audit(
      this.prisma,
      auth,
      'ReviewSummaryViewed',
      id,
      randomUUID(),
    ).catch(() => {});
    if (scope.readOnly) {
      const a = await this.approverView(this.prisma, id);
      return {
        applicationId: a.id,
        reference: a.reference,
        state: a.state,
        version: a.version,
        claimedAt: null,
        submittedAt: a.submission ? a.submission.createdAt.toISOString() : null,
        openClarifications: a.clarifications.filter((c) => c.status === 'OPEN')
          .length,
        openCorrections: a.correctionRequests.filter(
          (c) => c.status === 'PENDING',
        ).length,
        // Presence only: outcome/message/conditions stay out until slice 5.
        hasDecision: !!a.decision?.releasedAt,
      };
    }
    const assignment = await this.assigned(this.prisma, auth, id, scope);
    const a = assignment.application;
    return {
      applicationId: a.id,
      reference: a.reference,
      state: a.state,
      version: a.version,
      claimedAt: assignment.claimedAt.toISOString(),
      submittedAt: a.submission ? a.submission.createdAt.toISOString() : null,
      // Open-only like the queue and approver views: answered clarifications
      // and decided corrections stay in history but leave these counts.
      openClarifications: a.clarifications.filter((c) => c.status === 'OPEN')
        .length,
      openCorrections: a.correctionRequests.filter(
        (c) => c.status === 'PENDING',
      ).length,
      // Presence only: outcome/message/conditions stay out until slice 5.
      hasDecision: !!a.decision?.releasedAt,
    };
  }

  async claim(
    auth: ReviewerAuthority,
    applicationId: string,
    key: string,
    version: number,
  ): Promise<{ applicationId: string; status: string }> {
    const scope = await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      'ClaimReviewCase',
      { applicationId, version },
      async (db) => {
        const row = await db.application.findFirst({
          where: { id: applicationId },
          include: { offering: { include: { programme: true } } },
        });
        if (!row) this.fail('NOT_FOUND', 'Review case not found.', 404);
        // Neutral: out-of-scope intakes look like missing cases.
        if (!this.inScope(scope.scopeType, scope.scopeRef, row.offering.intake))
          this.fail('NOT_FOUND', 'Review case not found.', 404);
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_CLAIMABLE',
            'Only submitted applications awaiting review can be claimed.',
          );
        }
        // Serialize concurrent claims on the application row itself; the
        // partial unique index plus P2002 mapping is the final backstop.
        await db.$queryRaw`SELECT id FROM "Application" WHERE id = ${applicationId} FOR UPDATE`;
        this.checkVersion(row, version);
        const existing = await db.reviewAssignment.findFirst({
          where: { applicationId, status: 'CLAIMED' },
        });
        if (existing) {
          this.fail(
            'ASSIGNMENT_CONFLICT',
            'This case is already claimed by another reviewer.',
            409,
            { claimedByRole: 'ADMISSIONS' },
          );
        }
        await db.reviewAssignment.create({
          data: {
            applicationId,
            assigneeAccountId: auth.accountId,
            status: 'CLAIMED',
          },
        });
        await this.event(db, applicationId, {
          code: 'ReviewClaimed',
          label: 'Case claimed for review',
        });
        await this.audit(db, auth, 'ReviewCaseClaimed', applicationId, key);

        // Emit OutboxEvent for StaffAssessmentAssigned
        const correlationId = randomUUID();
        const applicantName = `${(row.personal as ApplicationRow['personal'])?.givenName ?? ''} ${(row.personal as ApplicationRow['personal'])?.familyName ?? ''}`;
        const programmeName = row.offering?.programme?.name ?? '';
        await db.outboxEvent.create({
          data: {
            aggregate: 'Application',
            aggregateId: applicationId,
            type: 'StaffAssessmentAssigned',
            payload: json({
              applicationId,
              assigneeAccountId: auth.accountId,
              applicantName,
              reference: row.reference,
              programmeName,
              intake: row.offering?.intake ?? '',
              assignedAt: new Date().toISOString(),
              dueBy: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0], // 14 days default
              recipientAccountId: auth.accountId,
              templateKey: 'STAFF_ASSESSMENT_ASSIGNED',
              templateVars: {
                reference: row.reference,
                applicantName,
                programmeName,
                intake: row.offering?.intake ?? '',
                assignedAt: new Date().toISOString().split('T')[0],
                dueBy: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0],
              },
              channels: ['internal'],
              correlationId,
              idempotencyKey: key,
            }),
          },
        });

        return { body: { applicationId, status: 'CLAIMED' } };
      },
    );
    return result as { applicationId: string; status: string };
  }

  async release(
    auth: ReviewerAuthority,
    applicationId: string,
    key: string,
    version: number,
  ): Promise<{ applicationId: string; status: string }> {
    const scope = await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      'ReleaseReviewCase',
      { applicationId, version },
      async (db) => {
        const assignment = await this.assigned(db, auth, applicationId, scope);
        const row = assignment.application;
        this.checkVersion(row, version);
        const mine = assignment;
        await db.reviewAssignment.update({
          where: { id: mine.id },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
        await this.event(db, applicationId, {
          code: 'ReviewReleased',
          label: 'Case released to the pool',
        });
        await this.audit(db, auth, 'ReviewCaseReleased', applicationId, key);
        return { body: { applicationId, status: 'RELEASED' } };
      },
    );
    return result as { applicationId: string; status: string };
  }
}
