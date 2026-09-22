import { Injectable, HttpException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { APPLICATION_DEMO_V1 as policy } from '@sis/config';
import type {
  ApplicantNotification,
  ApplicantOfferView,
  ApplicantTimeline,
  ApplicationStatusEvent,
  ClarificationView,
  CorrectionRequestView,
  DecisionOutcome,
  DecisionView,
  OfferReceipt,
  OnboardingView,
  SupportTicketView,
  WithdrawalReceipt,
} from '@sis/contracts';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { ApplicationsService } from './applications.service.js';
import { visibleTimeline } from './case.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

// Post-submit applicant case (Part 9): status timeline, scoped clarification
// responses, correction requests, decision viewing, support tickets,
// withdrawal with receipt, notification inbox. Read/write split: applicant
// views never include staff-only rows (visibleTimeline); staff issuance
// arrives through the Phase 3 officer/approver endpoints, which write the
// same commands/events/audit rows (GAP-017 closed in slice 5).
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
    const raw = Array.isArray(decision.conditions)
      ? (decision.conditions as unknown[])
      : [];
    // Structured conditions (slice 5); legacy plain-string rows read as
    // text-only applicant-owned conditions so older fixtures keep rendering.
    const conditions = raw.map((c) => {
      if (typeof c === 'string')
        return {
          text: c,
          detail: null,
          owner: 'APPLICANT',
          deadline: null,
          blocksMatriculation: false,
        };
      const row = c as Record<string, unknown>;
      return {
        text: typeof row.text === 'string' ? row.text : '',
        detail: typeof row.detail === 'string' ? row.detail : null,
        owner: typeof row.owner === 'string' ? row.owner : 'APPLICANT',
        deadline: typeof row.deadline === 'string' ? row.deadline : null,
        blocksMatriculation: row.blocksMatriculation === true,
      };
    });
    return {
      applicationId,
      reference: row.reference,
      outcome: decision.outcome as DecisionOutcome,
      message: decision.message,
      conditions,
      acceptBy: decision.acceptBy ? decision.acceptBy.toISOString() : null,
      decidedAt: decision.decidedAt.toISOString(),
    };
  }

  private toOffer(
    row: {
      id: string;
      reference: string;
      offering: {
        intake: string;
        studyMode: string;
        campus: string;
        programme: { name: string };
      };
    },
    decision: {
      outcome: string;
      message: string;
      conditions: unknown;
      acceptBy: Date | null;
      decidedAt: Date;
    },
    response: {
      decision: string;
      receipt: string;
      respondedAt: Date;
    } | null,
  ): ApplicantOfferView {
    const raw = Array.isArray(decision.conditions)
      ? (decision.conditions as unknown[])
      : [];
    return {
      applicationId: row.id,
      reference: row.reference,
      programmeName: row.offering.programme.name,
      intake: row.offering.intake,
      studyMode: row.offering.studyMode,
      campus: row.offering.campus,
      outcome: decision.outcome,
      message: decision.message,
      conditions: raw.map((c) => {
        if (typeof c === 'string')
          return {
            text: c,
            detail: null,
            owner: 'APPLICANT',
            deadline: null,
            blocksMatriculation: false,
          };
        const item = c as Record<string, unknown>;
        return {
          text: typeof item.text === 'string' ? item.text : '',
          detail: typeof item.detail === 'string' ? item.detail : null,
          owner: typeof item.owner === 'string' ? item.owner : 'APPLICANT',
          deadline: typeof item.deadline === 'string' ? item.deadline : null,
          blocksMatriculation: item.blocksMatriculation === true,
        };
      }),
      acceptBy: decision.acceptBy ? decision.acceptBy.toISOString() : null,
      decidedAt: decision.decidedAt.toISOString(),
      response: response
        ? {
            decision: response.decision,
            receipt: response.receipt,
            respondedAt: response.respondedAt.toISOString(),
          }
        : null,
    };
  }

  private isOfferOutcome(outcome: string): boolean {
    return outcome === 'ADMIT' || outcome === 'ADMIT_WITH_CONDITIONS';
  }

  async offer(
    auth: ActiveAuthority,
    applicationId: string,
  ): Promise<ApplicantOfferView> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId },
      include: { offering: { include: { programme: true } } },
    });
    if (!row) this.fail('NOT_FOUND', 'Application not found.', 404);
    await this.apps.own(this.prisma, auth, applicationId);
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
    if (!this.isOfferOutcome(decision.outcome)) {
      this.fail(
        'OFFER_NOT_AVAILABLE',
        'No admission offer is available for this application.',
        404,
      );
    }
    const response = await this.prisma.applicationOfferResponse.findUnique({
      where: { applicationId },
    });
    return this.toOffer(row, decision, response);
  }

  async respondToOffer(
    auth: ActiveAuthority,
    applicationId: string,
    key: string,
    version: number,
    decisionInput: string,
    reason?: string,
    declarations?: string[],
  ): Promise<OfferReceipt> {
    const result = await this.apps.command(
      auth,
      key,
      'RecordOfferResponse',
      { applicationId, version, decision: decisionInput },
      async (db) => {
        const row = await this.apps.own(db, auth, applicationId);
        if (row.state !== 'Submitted') {
          this.fail(
            'NOT_SUBMITTED',
            'Offer responses need a submitted application.',
          );
        }
        const decision = await db.applicationDecision.findUnique({
          where: { applicationId },
        });
        if (!decision || !decision.releasedAt) {
          this.fail(
            'DECISION_PENDING',
            'No admission decision is available for this application yet.',
            404,
          );
        }
        if (!this.isOfferOutcome(decision.outcome)) {
          this.fail(
            'OFFER_NOT_AVAILABLE',
            'No admission offer is available for this application.',
            404,
          );
        }
        const prior = await db.applicationOfferResponse.findUnique({
          where: { applicationId },
        });
        // Resource-idempotent: a second response attempt receives the stored
        // final status instead of creating a second record.
        if (prior) {
          return {
            body: {
              receipt: prior.receipt,
              decision: prior.decision,
              respondedAt: (prior.respondedAt as Date).toISOString(),
            },
          };
        }
        this.checkVersion(row, version);
        if (decisionInput === 'ACCEPT') {
          if (!decision.acceptBy || decision.acceptBy.getTime() < Date.now()) {
            this.fail(
              'OFFER_EXPIRED',
              'This offer expired. Contact Admissions only if a late-response review applies; extensions need an authorized approver.',
              409,
            );
          }
          // Required acceptance declarations (Part 10 s4.1) against the
          // versioned demo offer policy.
          const required = (
            policy.offer.acceptanceDeclarations as Array<{ key: string }>
          ).map((d) => d.key);
          const accepted = new Set(declarations ?? []);
          if (!required.every((k) => accepted.has(k))) {
            this.fail(
              'DECLARATIONS_INCOMPLETE',
              'Confirm every offer declaration before accepting.',
              400,
            );
          }
        }
        const receipt = randomUUID();
        const created = await db.applicationOfferResponse.create({
          data: {
            applicationId,
            decision: decisionInput,
            reason: reason?.trim() ? reason.trim() : null,
            receipt,
          },
        });
        if (decisionInput === 'ACCEPT') {
          for (const task of policy.onboarding.tasks as Array<{
            key: string;
            title: string;
            owner: string;
            required: boolean;
          }>) {
            await db.onboardingTask.create({
              data: {
                applicationId,
                taskKey: task.key,
                title: task.title,
                owner: task.owner,
                required: task.required,
              },
            });
          }
        }
        await this.event(db, applicationId, {
          code: decisionInput === 'ACCEPT' ? 'OfferAccepted' : 'OfferDeclined',
          label:
            decisionInput === 'ACCEPT'
              ? 'Admission offer accepted'
              : 'Admission offer declined',
          detail:
            decisionInput === 'ACCEPT'
              ? 'Onboarding tasks are now listed for this application.'
              : 'The response is recorded. Capacity returns through the admissions workflow.',
          actorRole: 'APPLICANT',
        });
        await db.application.update({
          where: { id: applicationId },
          data: { version: { increment: 1 } },
        });
        await this.apps.audit(
          db,
          auth,
          'AdmissionOfferResponseRecorded',
          applicationId,
          key,
          'ALLOW',
          {
            decision: decisionInput,
            receipt,
            declarations:
              decisionInput === 'ACCEPT'
                ? (policy.offer as { version: string }).version
                : null,
          },
        );
        await this.notify(
          db,
          auth.accountId,
          applicationId,
          'OFFER_RESPONSE_RECORDED',
          'Your offer response is recorded. Sign in to view the next tasks.',
          { applicationId },
        );
        return {
          body: {
            receipt: created.receipt,
            decision: created.decision,
            respondedAt: (created.respondedAt as Date).toISOString(),
          },
        };
      },
    );
    return result as OfferReceipt;
  }

  async onboarding(
    auth: ActiveAuthority,
    applicationId: string,
  ): Promise<OnboardingView> {
    const row = await this.apps.own(this.prisma, auth, applicationId);
    const response = await this.prisma.applicationOfferResponse.findUnique({
      where: { applicationId },
    });
    if (!response || response.decision !== 'ACCEPT') {
      this.fail(
        'ONBOARDING_NOT_AVAILABLE',
        'Onboarding tasks appear after an accepted admission offer.',
        404,
      );
    }
    const tasks = await this.prisma.onboardingTask.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });
    const required = tasks.filter((t) => t.required);
    return {
      applicationId: row.id,
      requiredTotal: required.length,
      requiredComplete: required.filter((t) => t.status === 'COMPLETED').length,
      tasks: tasks.map((t) => ({
        id: t.id,
        taskKey: t.taskKey,
        title: t.title,
        owner: t.owner,
        required: t.required,
        status: t.status,
        dueAt: t.dueAt ? (t.dueAt as Date).toISOString() : null,
        completedAt: t.completedAt
          ? (t.completedAt as Date).toISOString()
          : null,
      })),
    };
  }

  async completeOnboardingTask(
    auth: ActiveAuthority,
    applicationId: string,
    key: string,
    version: number,
    taskKey: string,
  ): Promise<{ id: string; status: string }> {
    const result = await this.apps.command(
      auth,
      key,
      'CompleteOnboardingTask',
      { applicationId, version, taskKey },
      async (db) => {
        const row = await this.apps.own(db, auth, applicationId);
        const task = await db.onboardingTask.findFirst({
          where: { applicationId, taskKey },
        });
        if (!task) this.fail('NOT_FOUND', 'Onboarding task not found.', 404);
        if (task.owner !== 'APPLICANT') {
          this.fail(
            'TASK_NOT_APPLICANT',
            'This task is completed by the responsible office, not here.',
            403,
          );
        }
        if (task.status === 'COMPLETED') {
          return { body: { id: task.id, status: task.status } };
        }
        this.checkVersion(row, version);
        const done = await db.onboardingTask.update({
          where: { id: task.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        await this.event(db, applicationId, {
          code: 'OnboardingTaskCompleted',
          label: 'Onboarding task completed',
          detail: task.title,
          actorRole: 'APPLICANT',
        });
        await db.application.update({
          where: { id: applicationId },
          data: { version: { increment: 1 } },
        });
        await this.apps.audit(
          db,
          auth,
          'OnboardingTaskCompleted',
          applicationId,
          key,
          'ALLOW',
          { taskKey: task.taskKey },
        );
        return { body: { id: done.id, status: done.status } };
      },
    );
    return result as { id: string; status: string };
  }
}
