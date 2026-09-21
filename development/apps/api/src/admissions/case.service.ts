import { Injectable, HttpException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { APPLICATION_DEMO_V1 as policy } from '@sis/config';
import type {
  ApplicantNotification,
  ApplicantTimeline,
  ApplicationStatusEvent,
  ClarificationView,
  CorrectionRequestView,
  DecisionOutcome,
  DecisionView,
  SupportTicketView,
  WithdrawalReceipt,
} from '@sis/contracts';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { hasActiveAuthority } from '../identity-access/active-authority.js';
import { ApplicationsService } from './applications.service.js';
import { visibleTimeline } from './case.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

// Post-submit applicant case (Part 9): status timeline, scoped clarification
// responses, correction requests, decision viewing, support tickets,
// withdrawal with receipt, notification inbox. Read/write split: applicant
// views never include staff-only rows (visibleTimeline); staff issuance
// arrives only through the SYSADMIN-gated simulation endpoints below, which
// write the same commands/events/audit rows the Phase 3 queue will write.
// Removal before any production use is tracked as an open gate.
@Injectable()
export class ApplicationCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apps: ApplicationsService,
  ) {}

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
          'Review the current application status, or contact Admissions.',
        ...extra,
      },
      status,
    );
  }

  private async staffGate(actor: ActiveAuthority): Promise<void> {
    const ok = await hasActiveAuthority(this.prisma, actor, ['SYSADMIN']);
    if (!ok) {
      throw new HttpException(
        {
          message:
            'This demonstration action needs an administrator workspace.',
        },
        403,
      );
    }
  }

  private async event(
    db: Tx,
    applicationId: string,
    row: {
      code: string;
      label: string;
      detail?: string;
      actorRole: string;
      applicantVisible?: boolean;
    },
  ): Promise<void> {
    await db.applicationStatusEvent.create({
      data: {
        applicationId,
        code: row.code,
        label: row.label,
        detail: row.detail ?? null,
        actorRole: row.actorRole,
        applicantVisible: row.applicantVisible ?? true,
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

  private checkVersion(row: { version: number }, expected: number): void {
    if (row.version !== expected) {
      this.fail(
        'VERSION_CONFLICT',
        'This application changed since you reviewed it. Reload the timeline and try again with the current version.',
        409,
        { currentVersion: row.version },
      );
    }
  }

  // Simulation endpoints bypass apps.command() (its actor() gate requires
  // an APP workspace; SYSADMIN drives these). Same idempotency contract:
  // key bound to actor/action/payload, replay returns the stored response.
  private async simIdempotent<T>(
    actor: ActiveAuthority,
    key: string,
    action: string,
    payload: unknown,
    fn: () => Promise<T>,
  ): Promise<T> {
    const digest = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const prior = await this.prisma.applicationCommand.findUnique({
      where: { key },
    });
    if (prior) {
      if (
        prior.accountId !== actor.accountId ||
        prior.action !== action ||
        prior.digest !== digest
      ) {
        this.fail(
          'IDEMPOTENCY_CONFLICT',
          'This request reference belongs to a different action. Review the current saved state.',
        );
      }
      return prior.response as T;
    }
    const body = await fn();
    await this.prisma.applicationCommand.create({
      data: {
        key,
        accountId: actor.accountId,
        action,
        digest,
        status: 201,
        response: JSON.parse(JSON.stringify(body)),
      },
    });
    return body;
  }

  private async staffAudit(
    db: Tx,
    actor: ActiveAuthority,
    action: string,
    applicationId: string,
    outcome = 'ALLOW',
  ): Promise<void> {
    await db.auditEvent.create({
      data: {
        action,
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole ?? 'SYSADMIN',
        scope: `APPLICATION:${applicationId}`,
        targetRef: applicationId,
        outcome,
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Demonstration staff simulation',
        metadata: json({ demo: true }),
      },
    });
  }

  private toEvent(row: {
    id: string;
    occurredAt: Date;
    code: string;
    label: string;
    detail: string | null;
    actorRole: string;
    applicantVisible: boolean;
  }): ApplicationStatusEvent {
    return {
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      code: row.code,
      label: row.label,
      detail: row.detail,
      actorRole: row.actorRole,
      applicantVisible: row.applicantVisible,
    };
  }

  async timeline(
    auth: ActiveAuthority,
    id: string,
  ): Promise<ApplicantTimeline> {
    const row = await this.apps.own(this.prisma, auth, id);
    const stored = await this.prisma.applicationStatusEvent.findMany({
      where: { applicationId: id },
      orderBy: { occurredAt: 'asc' },
    });
    const events = stored.map((r) => this.toEvent(r));
    if (row.submission) {
      events.push({
        id: `submission:${row.submission.id}`,
        occurredAt: row.submission.createdAt.toISOString(),
        code: 'Submitted',
        label: 'Application received',
        detail: `Reference ${row.submission.reference}.`,
        actorRole: 'APPLICANT',
        applicantVisible: true,
      });
    }
    return {
      applicationId: row.id,
      reference: row.reference,
      state: row.state,
      version: row.version,
      events: visibleTimeline(events),
    };
  }

  async notifications(auth: ActiveAuthority): Promise<{
    items: ApplicantNotification[];
  }> {
    const rows = await this.prisma.applicantNotification.findMany({
      where: { accountId: auth.accountId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        applicationId: r.applicationId,
        readAt: r.readAt ? r.readAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async markNotificationRead(
    auth: ActiveAuthority,
    notificationId: string,
  ): Promise<{ id: string; readAt: string }> {
    const row = await this.prisma.applicantNotification.findFirst({
      where: { id: notificationId, accountId: auth.accountId },
    });
    if (!row) this.fail('NOT_FOUND', 'Notification not found.', 404);
    const updated = await this.prisma.applicantNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return {
      id: updated.id,
      readAt: (updated.readAt as Date).toISOString(),
    };
  }

  async clarificationRespond(
    auth: ActiveAuthority,
    applicationId: string,
    clarificationId: string,
    key: string,
    version: number,
    response: string,
  ): Promise<{ receipt: string; answeredAt: string }> {
    const result = await this.apps.command(
      auth,
      key,
      'RespondClarification',
      { applicationId, clarificationId, version, response },
      async (db) => {
        const row = await this.apps.own(db, auth, applicationId);
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_SUBMITTED',
            'Clarification responses need a submitted application.',
          );
        }
        const clar = await db.applicationClarification.findFirst({
          where: { id: clarificationId, applicationId },
        });
        if (!clar || clar.status !== 'OPEN') {
          this.fail(
            'REQUEST_CLOSED',
            'This clarification request is no longer open.',
            404,
          );
        }
        if (clar.deadline && clar.deadline.getTime() < Date.now()) {
          this.fail(
            'RESPONSE_LATE',
            'The response deadline has passed. Your application is awaiting an Admissions decision under the applicable rule.',
          );
        }
        if (!response.trim()) {
          this.fail(
            'EMPTY_RESPONSE',
            'Write a response before submitting.',
            400,
          );
        }
        this.checkVersion(row, version);
        const receipt = randomUUID();
        const previousResponse = clar.response ?? null;
        await db.applicationClarification.update({
          where: { id: clar.id },
          data: {
            response: response.trim(),
            status: 'ANSWERED',
            answeredAt: new Date(),
            receipt,
          },
        });
        await this.event(db, applicationId, {
          code: 'ClarificationReceived',
          label: 'Information received',
          detail:
            'Admissions will review it and update the application status.',
          actorRole: 'APPLICANT',
        });
        await db.application.update({
          where: { id: applicationId },
          data: { version: { increment: 1 } },
        });
        await this.apps.audit(
          db,
          auth,
          'ApplicationClarificationResponseSubmitted',
          applicationId,
          key,
          'ALLOW',
          {
            clarificationId: clar.id,
            oldValue: previousResponse,
            newValue: response.trim(),
            receipt,
          },
        );
        return {
          body: { receipt, answeredAt: new Date().toISOString() },
        };
      },
    );
    return result as { receipt: string; answeredAt: string };
  }

  async correctionRequest(
    auth: ActiveAuthority,
    applicationId: string,
    key: string,
    version: number,
    section: string,
    field: string,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    const allowed = ['personal', 'contact', 'qualifications', 'programme'];
    const result = await this.apps.command(
      auth,
      key,
      'RequestCorrection',
      { applicationId, version, section, field, reason },
      async (db) => {
        const row = await this.apps.own(db, auth, applicationId);
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_SUBMITTED',
            'Corrections need a submitted application.',
          );
        }
        if (!allowed.includes(section)) {
          this.fail('UNKNOWN_SECTION', 'Unknown correction category.', 400);
        }
        const open = await db.applicationCorrectionRequest.findFirst({
          where: { applicationId, section, field, status: 'PENDING' },
        });
        if (open) {
          this.fail(
            'DUPLICATE_TASK',
            'An open correction request already covers this item. Respond there instead of opening another.',
            409,
            { correctionId: open.id },
          );
        }
        if (!reason.trim()) {
          this.fail(
            'EMPTY_REASON',
            'Explain why the correction is needed.',
            400,
          );
        }
        this.checkVersion(row, version);
        const created = await db.applicationCorrectionRequest.create({
          data: {
            applicationId,
            section,
            field,
            reason: reason.trim(),
            status: 'PENDING',
          },
        });
        await this.event(db, applicationId, {
          code: 'CorrectionRequested',
          label: 'Correction requested',
          detail: policy.case.correctionReviewNote,
          actorRole: 'APPLICANT',
        });
        await db.application.update({
          where: { id: applicationId },
          data: { version: { increment: 1 } },
        });
        await this.apps.audit(
          db,
          auth,
          'ApplicationCorrectionRequested',
          applicationId,
          key,
          'ALLOW',
          { section, field, reason: reason.trim() },
        );
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result as { id: string; status: string };
  }

  async withdraw(
    auth: ActiveAuthority,
    applicationId: string,
    key: string,
    version: number,
    confirmed: boolean,
    reason?: string,
  ): Promise<WithdrawalReceipt> {
    const result = await this.apps.command(
      auth,
      key,
      'WithdrawApplication',
      { applicationId, version, confirmed, reason },
      async (db) => {
        const row = await this.apps.own(db, auth, applicationId);
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_WITHDRAWABLE',
            'Only a submitted application awaiting decision can be withdrawn here.',
          );
        }
        if (confirmed !== true) {
          this.fail(
            'CONFIRM_REQUIRED',
            'Confirm the withdrawal to continue. Keeping the application leaves assessment unchanged.',
            400,
          );
        }
        this.checkVersion(row, version);
        const receipt = randomUUID();
        await db.application.update({
          where: { id: applicationId },
          data: { state: 'Withdrawn', version: { increment: 1 } },
        });
        // Withdrawal ends assessment: release any active review claim so the
        // case leaves officer queues instead of lingering as stale work.
        const released = await db.reviewAssignment.updateMany({
          where: { applicationId, status: 'CLAIMED' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
        if (released.count > 0) {
          await this.event(db, applicationId, {
            code: 'ReviewReleased',
            label: 'Case released by withdrawal',
            detail: 'Assessment ended when the applicant withdrew.',
            actorRole: 'ADMISSIONS',
            applicantVisible: false,
          });
        }
        await db.applicationWithdrawal.create({
          data: {
            applicationId,
            reason: reason?.trim() || null,
            receipt,
          },
        });
        await this.event(db, applicationId, {
          code: 'Withdrawn',
          label: 'Application withdrawn',
          detail:
            'Assessment ends here. Records stay under the configured retention policy. Refunds need a separate request.',
          actorRole: 'APPLICANT',
        });
        await this.apps.audit(
          db,
          auth,
          'ApplicationWithdrawalRequested',
          applicationId,
          key,
        );
        return {
          body: {
            applicationId,
            reference: row.reference,
            reason: reason?.trim() || null,
            receipt,
            withdrawnAt: new Date().toISOString(),
          },
        };
      },
    );
    return result as WithdrawalReceipt;
  }

  async createTicket(
    auth: ActiveAuthority,
    applicationId: string,
    key: string,
    version: number,
    subject: string,
    message: string,
  ): Promise<{ id: string; status: string }> {
    const result = await this.apps.command(
      auth,
      key,
      'CreateSupportTicket',
      { applicationId, version, subject, message },
      async (db) => {
        const row = await this.apps.own(db, auth, applicationId);
        this.checkVersion(row, version);
        if (!subject.trim() || !message.trim()) {
          this.fail(
            'EMPTY_TICKET',
            'Give the ticket a subject and a message.',
            400,
          );
        }
        const ticket = await db.supportTicket.create({
          data: {
            accountId: auth.accountId,
            applicationId,
            subject: subject.trim(),
            status: 'OPEN',
          },
        });
        await db.supportTicketMessage.create({
          data: {
            ticketId: ticket.id,
            authorRole: 'APPLICANT',
            body: message.trim(),
          },
        });
        await this.apps.audit(
          db,
          auth,
          'ApplicantSupportTicketCreated',
          applicationId,
          key,
        );
        return { body: { id: ticket.id, status: ticket.status } };
      },
    );
    return result as { id: string; status: string };
  }

  async listClarifications(
    auth: ActiveAuthority,
    applicationId: string,
  ): Promise<{ items: ClarificationView[] }> {
    await this.apps.own(this.prisma, auth, applicationId);
    const rows = await this.prisma.applicationClarification.findMany({
      where: { applicationId },
      orderBy: { askedAt: 'desc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        question: r.question,
        deadline: r.deadline ? r.deadline.toISOString() : null,
        response: r.response,
        status: r.status as ClarificationView['status'],
        askedBy: r.askedBy,
        askedAt: r.askedAt.toISOString(),
        answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null,
        receipt: r.receipt,
      })),
    };
  }

  async listCorrections(
    auth: ActiveAuthority,
    applicationId: string,
  ): Promise<{ items: CorrectionRequestView[] }> {
    await this.apps.own(this.prisma, auth, applicationId);
    const rows = await this.prisma.applicationCorrectionRequest.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        section: r.section,
        field: r.field,
        reason: r.reason,
        status: r.status as CorrectionRequestView['status'],
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
      })),
    };
  }

  async listTickets(
    auth: ActiveAuthority,
    applicationId: string,
  ): Promise<{ items: SupportTicketView[] }> {
    await this.apps.own(this.prisma, auth, applicationId);
    const rows = await this.prisma.supportTicket.findMany({
      where: { applicationId, accountId: auth.accountId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: rows.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status as SupportTicketView['status'],
        createdAt: t.createdAt.toISOString(),
        messages: t.messages.map((m) => ({
          id: m.id,
          authorRole: m.authorRole,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      })),
    };
  }

  async replyTicket(
    auth: ActiveAuthority,
    applicationId: string,
    ticketId: string,
    key: string,
    version: number,
    message: string,
  ): Promise<{ id: string }> {
    const result = await this.apps.command(
      auth,
      key,
      'ReplySupportTicket',
      { applicationId, ticketId, version, message },
      async (db) => {
        const row = await this.apps.own(db, auth, applicationId);
        this.checkVersion(row, version);
        const ticket = await db.supportTicket.findFirst({
          where: { id: ticketId, applicationId, accountId: auth.accountId },
        });
        if (!ticket) this.fail('NOT_FOUND', 'Support ticket not found.', 404);
        if (ticket.status === 'RESOLVED') {
          this.fail(
            'TICKET_CLOSED',
            'This ticket is resolved. Open a new ticket for anything further.',
          );
        }
        if (!message.trim()) {
          this.fail('EMPTY_TICKET', 'Write a reply before sending.', 400);
        }
        const created = await db.supportTicketMessage.create({
          data: {
            ticketId: ticket.id,
            authorRole: 'APPLICANT',
            body: message.trim(),
          },
        });
        await this.apps.audit(
          db,
          auth,
          'ApplicantSupportTicketReplied',
          applicationId,
          key,
        );
        return { body: { id: created.id } };
      },
    );
    return result as { id: string };
  }

  async decision(
    auth: ActiveAuthority,
    applicationId: string,
  ): Promise<DecisionView> {
    const row = await this.apps.own(this.prisma, auth, applicationId);
    const decision = await this.prisma.applicationDecision.findUnique({
      where: { applicationId },
    });
    if (!decision || !decision.releasedAt) {
      this.fail(
        'DECISION_PENDING',
        'No admission decision is available for this application yet.',
        404,
      );
    }
    const conditions = Array.isArray(decision.conditions)
      ? (decision.conditions as string[])
      : [];
    return {
      applicationId,
      reference: row.reference,
      outcome: decision.outcome as DecisionOutcome,
      message: decision.message,
      conditions,
      decidedAt: decision.decidedAt.toISOString(),
    };
  }

  async simulateClarification(
    actor: ActiveAuthority,
    applicationId: string,
    key: string,
    question: string,
    deadlineDays?: number,
  ): Promise<{ id: string; status: string }> {
    await this.staffGate(actor);
    const days = deadlineDays ?? policy.case.clarificationResponseDays;
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId },
    });
    if (!row) this.fail('NOT_FOUND', 'Application not found.', 404);
    if (row.state !== 'Submitted') {
      this.fail(
        'NOT_SUBMITTED',
        'Clarification needs a submitted application.',
      );
    }
    return this.simIdempotent(
      actor,
      key,
      'SimulateClarification',
      { applicationId, question, deadlineDays },
      async () =>
        this.prisma.$transaction(async (db) => {
          const clar = await db.applicationClarification.create({
            data: {
              applicationId,
              question: question.trim(),
              deadline: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
              status: 'OPEN',
              askedBy: 'ADMISSIONS (simulation)',
            },
          });
          await this.event(db, applicationId, {
            code: 'ClarificationRequired',
            label: 'Action needed: provide information',
            detail: question.trim(),
            actorRole: 'ADMISSIONS',
          });
          await this.notify(
            db,
            row.accountId,
            applicationId,
            'CLARIFICATION_REQUEST',
            'Action needed on your application',
            { applicationId, clarificationId: clar.id },
          );
          await this.staffAudit(
            db,
            actor,
            'ApplicationClarificationRequested',
            applicationId,
            key,
          );
          return { id: clar.id, status: clar.status };
        }),
    );
  }

  async simulateDecision(
    actor: ActiveAuthority,
    applicationId: string,
    key: string,
    outcome: string,
    message: string,
    conditions: string[],
  ): Promise<{ id: string; outcome: string }> {
    await this.staffGate(actor);
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId },
    });
    if (!row) this.fail('NOT_FOUND', 'Application not found.', 404);
    if (row.state !== 'Submitted') {
      this.fail(
        'NOT_SUBMITTED',
        'Decisions release only for submitted applications.',
      );
    }
    const existing = await this.prisma.applicationDecision.findUnique({
      where: { applicationId },
    });
    if (existing?.releasedAt) {
      this.fail(
        'ALREADY_RELEASED',
        'A decision is already released for this application.',
      );
    }
    return this.simIdempotent(
      actor,
      key,
      'SimulateDecision',
      { applicationId, outcome, message, conditions },
      async () =>
        this.prisma.$transaction(async (db) => {
          const decision = existing
            ? await db.applicationDecision.update({
                where: { applicationId },
                data: {
                  outcome,
                  message: message.trim(),
                  conditions:
                    conditions as unknown as Prisma.InputJsonValue,
                  decidedAt: new Date(),
                  releasedAt: new Date(),
                },
              })
            : await db.applicationDecision.create({
                data: {
                  applicationId,
                  outcome,
                  message: message.trim(),
                  conditions:
                    conditions as unknown as Prisma.InputJsonValue,
                  releasedAt: new Date(),
                },
              });
          await this.event(db, applicationId, {
            code: outcome === 'OFFERED' ? 'Offered' : 'DecisionReleased',
            label:
              outcome === 'OFFERED'
                ? 'Admission offer available'
                : 'Admission decision available',
            detail: 'Sign in to view the decision securely.',
            actorRole: 'ADMISSIONS',
          });
          await this.notify(
            db,
            row.accountId,
            applicationId,
            'DECISION_RELEASED',
            'An admission decision is available for your application. Sign in to view it securely.',
            { applicationId, decisionId: decision.id },
          );
          await this.staffAudit(
            db,
            actor,
            'AdmissionDecisionReleased',
            applicationId,
            key,
          );
          return { id: decision.id, outcome: decision.outcome };
        }),
    );
  }

  // Demo stand-in for the Phase 3 correction-approval queue. Records an
  // approval or rejection without rewriting the immutable submitted snapshot:
  // approval preserves the original by construction.
  async simulateCorrectionDecision(
    actor: ActiveAuthority,
    applicationId: string,
    key: string,
    correctionId: string,
    approve: boolean,
    note?: string,
  ): Promise<{ id: string; status: string }> {
    await this.staffGate(actor);
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId },
    });
    if (!row) this.fail('NOT_FOUND', 'Application not found.', 404);
    if (row.state !== 'Submitted') {
      this.fail(
        'NOT_SUBMITTED',
        'Correction decisions need a submitted application.',
      );
    }
    return this.simIdempotent(
      actor,
      key,
      'SimulateCorrectionDecision',
      { applicationId, correctionId, approve, note },
      async () =>
        this.prisma.$transaction(async (db) => {
          const correction =
            await db.applicationCorrectionRequest.findFirst({
              where: { id: correctionId, applicationId },
            });
          if (!correction) {
            this.fail(
              'NOT_FOUND',
              'Correction request not found.',
              404,
            );
          }
          if (correction.status !== 'PENDING') {
            this.fail(
              'REQUEST_CLOSED',
              'This correction request is already decided.',
              409,
            );
          }
          const status = approve ? 'APPROVED' : 'REJECTED';
          const decided = await db.applicationCorrectionRequest.update({
            where: { id: correction.id },
            data: { status, decidedAt: new Date() },
          });
          await this.event(db, applicationId, {
            code: approve ? 'AmendmentApproved' : 'AmendmentDeclined',
            label: approve
              ? 'Correction approved'
              : 'Correction not approved',
            detail: note?.trim()
              ? note.trim()
              : approve
                ? 'Admissions approved the correction request. The submitted snapshot stays unchanged in this demonstration.'
                : 'Admissions did not approve the correction request. The submitted application is unchanged.',
            actorRole: 'ADMISSIONS',
          });
          await this.notify(
            db,
            row.accountId,
            applicationId,
            approve ? 'CORRECTION_APPROVED' : 'CORRECTION_DECLINED',
            'Update on your correction request. Sign in to view it securely.',
            { applicationId, correctionId: correction.id, status },
          );
          await this.staffAudit(
            db,
            actor,
            approve
              ? 'ApplicationAmendmentApproved'
              : 'ApplicationAmendmentDeclined',
            applicationId,
            key,
          );
          return { id: decided.id, status: decided.status };
        }),
    );
  }
}
