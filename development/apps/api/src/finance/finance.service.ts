import { HttpException, Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { FINANCE_DEMO_V1 as policy } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface FinanceAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

// Phase 5 slice 1: versioned fee assessment (TASK-PH5-001). The demo fee
// policy assesses charges for the registered roster: one flat registration
// fee per period plus one per-course fee per enrolled course. Posted charge
// lines are immutable; re-assessment appends missing lines only. Money is
// integer minor units + ZMW throughout; no floating point anywhere.
@Injectable()
export class FinanceService {
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
          'Review the finance account state, or contact Student Finance.',
        ...extra,
      },
      status,
    );
  }

  private async liveAssignment(
    auth: FinanceAuthority,
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
          code: 'FINANCE_UNAVAILABLE',
          message:
            'The finance service could not complete this action. Check the current state before retrying.',
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
        activeRole: actor.activeRole ?? 'FINANCE_OFFICER',
        scope: `FINANCE:${id}`,
        targetRef: id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Student finance assessment',
        metadata: json(metadata),
      },
    });
  }

  private async studentOf(auth: FinanceAuthority) {
    const studentSession = await this.liveAssignment(auth, 'STUDENT', 'study');
    if (!studentSession) {
      throw new HttpException(
        { message: 'This finance workspace is unavailable.' },
        403,
      );
    }
    const account = await this.prisma.account.findUnique({
      where: { id: auth.accountId },
    });
    if (!account) this.fail('NOT_FOUND', 'Student record not found.', 404);
    const student = await this.prisma.student.findUnique({
      where: { personId: account.personId },
    });
    if (!student) this.fail('NOT_FOUND', 'Student record not found.', 404);
    return student;
  }

  private async periodOf(code?: string) {
    const period = code
      ? await this.prisma.academicPeriod.findUnique({
          where: { code },
        })
      : await this.prisma.academicPeriod.findUnique({
          where: { code: '2026S1' },
        });
    if (!period) this.fail('NOT_FOUND', 'Academic period not found.', 404);
    return period;
  }

  private clearanceWording(status: string): string {
    const wording = policy.wording as Record<string, string>;
    return wording[status] ?? 'Clearance is being prepared';
  }

  private nextActionFor(status: string): string {
    switch (status) {
      case 'CLEARED':
        return 'No finance action required for this period.';
      case 'HELD':
        return 'Contact Student Finance to resolve the block on your registration.';
      case 'MANUAL_REVIEW':
        return 'Finance is reviewing your case. Wait for their update before paying again.';
      case 'PENDING':
        return 'Complete the required payment or funding action for this period.';
      default:
        return 'Finance is preparing your clearance assessment. Your invoice below shows what you owe.';
    }
  }

  private invoiceView(
    invoice: {
      id: string;
      reference: string;
      policyVersion: string;
      status: string;
      dueAt: Date | null;
      createdAt: Date;
      lines: Array<{
        id: string;
        code: string;
        description: string;
        amountMinor: number;
        currency: string;
        feeRule: string;
        policyVersion: string;
        status: string;
        course: { code: string; title: string } | null;
      }>;
    },
    periodCode: string,
  ) {
    const lines = [...invoice.lines].sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    return {
      id: invoice.id,
      reference: invoice.reference,
      period: periodCode,
      policyVersion: invoice.policyVersion,
      status: invoice.status,
      dueAt: invoice.dueAt ? invoice.dueAt.toISOString() : null,
      lines: lines.map((l) => ({
        id: l.id,
        code: l.code,
        description: l.description,
        courseCode: l.course?.code ?? null,
        courseTitle: l.course?.title ?? null,
        amountMinor: l.amountMinor,
        currency: l.currency,
        feeRule: l.feeRule,
        policyVersion: l.policyVersion,
        status: l.status,
      })),
      totalMinor: lines.reduce((sum, l) => sum + l.amountMinor, 0),
      currency: policy.currency,
      assessedAt: invoice.createdAt.toISOString(),
    };
  }

  private courseFeeMinor(courseCode: string): number {
    const overrides = policy.billing.courseFeeOverridesMinor as Record<
      string,
      number
    >;
    return overrides[courseCode] ?? policy.billing.courseFeeMinor;
  }

  async assessCharges(
    auth: FinanceAuthority,
    key: string,
    input: { attemptId?: string; period?: string },
  ) {
    // Assessment is a finance authority act: students read invoices but
    // never assess charges (permission Part 3A: student never changes
    // balance; lecturers see no amounts).
    const assignment = await this.liveAssignment(
      auth,
      'FINANCE_OFFICER',
      'assess-charges',
    );
    if (!assignment || auth.activeRole !== 'FINANCE_OFFICER') {
      throw new HttpException(
        { message: 'This finance workspace is unavailable.' },
        403,
      );
    }
    if (!input.attemptId) {
      this.fail(
        'ATTEMPT_REQUIRED',
        'Name the programme attempt to assess.',
        400,
      );
    }
    const attempt = await this.prisma.programmeAttempt.findUnique({
      where: { id: input.attemptId },
      include: { student: true },
    });
    if (!attempt) this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
    const period = input.period
      ? await this.prisma.academicPeriod.findUnique({
          where: { code: input.period },
        })
      : await this.prisma.academicPeriod.findUnique({
          where: { code: '2026S1' },
        });
    if (!period) this.fail('NOT_FOUND', 'Academic period not found.', 404);
    const registration =
      await this.prisma.institutionalRegistration.findUnique({
        where: {
          attemptId_periodId: { attemptId: attempt.id, periodId: period.id },
        },
        include: {
          roster: {
            where: { status: 'ENROLLED' },
            include: { course: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    if (!registration) {
      this.fail(
        'NO_REGISTRATION',
        'There is no submitted registration to assess for this period.',
        404,
      );
    }
    const result = await this.command(
      auth,
      key,
      'AssessStudentCharges',
      { attemptId: attempt.id, period: period.code },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "ProgrammeAttempt" WHERE id = ${attempt.id} FOR UPDATE`;
        let account = await db.financeAccount.findUnique({
          where: { studentId: attempt.studentId },
        });
        if (!account) {
          account = await db.financeAccount.create({
            data: { studentId: attempt.studentId },
          });
        }
        let invoice = await db.financeInvoice.findUnique({
          where: {
            accountId_periodId: { accountId: account.id, periodId: period.id },
          },
          include: { lines: { include: { course: true } } },
        });
        if (!invoice) {
          const seq = await db.$queryRaw<
            Array<{ n: bigint }>
          >`SELECT nextval('"InvoiceNumberSeq"') AS n`;
          const reference = `${policy.invoiceNumberPrefix}${String(Number(seq[0].n)).padStart(4, '0')}`;
          const dueDates = policy.dueDates as Record<string, string>;
          invoice = await db.financeInvoice.create({
            data: {
              accountId: account.id,
              periodId: period.id,
              reference,
              policyVersion: policy.version,
              status: 'ISSUED',
              dueAt: dueDates[period.code]
                ? new Date(dueDates[period.code])
                : null,
            },
            include: { lines: { include: { course: true } } },
          });
          await this.audit(db, auth, 'StudentChargesAssessed', invoice.id, key, {
            reference,
            period: period.code,
            policyVersion: policy.version,
          });
        }
        // Append-only: every enrolled roster course without a posted
        // COURSE_FEE line gains one; posted lines are never edited.
        const postedCourseIds = new Set(
          invoice.lines
            .filter((l) => l.code === 'COURSE_FEE' && l.courseId)
            .map((l) => l.courseId as string),
        );
        const hasRegistrationFee = invoice.lines.some(
          (l) => l.code === 'REGISTRATION_FEE',
        );
        if (!hasRegistrationFee) {
          await db.financeChargeLine.create({
            data: {
              invoiceId: invoice.id,
              code: 'REGISTRATION_FEE',
              description: `Registration fee for ${period.code}`,
              amountMinor: policy.billing.registrationFeeMinor,
              currency: policy.currency,
              feeRule: 'PER_PERIOD_REGISTRATION_FEE',
              policyVersion: policy.version,
              inputs: json({ period: period.code }),
              status: 'POSTED',
            },
          });
        }
        for (const row of registration.roster) {
          if (postedCourseIds.has(row.courseId)) continue;
          await db.financeChargeLine.create({
            data: {
              invoiceId: invoice.id,
              code: 'COURSE_FEE',
              description: `${row.course.code} — ${row.course.title}`,
              courseId: row.courseId,
              amountMinor: this.courseFeeMinor(row.course.code),
              currency: policy.currency,
              feeRule: 'PER_COURSE_ENROLLED_FEE',
              policyVersion: policy.version,
              inputs: json({
                courseCode: row.course.code,
                credits: row.course.credits,
                registrationId: registration.id,
              }),
              status: 'POSTED',
            },
          });
        }
        const fresh = await db.financeInvoice.findUniqueOrThrow({
          where: { id: invoice.id },
          include: { lines: { include: { course: true } } },
        });
        return { body: this.invoiceView(fresh, period.code) };
      },
    );
    return result;
  }

  async readInvoice(
    auth: FinanceAuthority,
    periodCode?: string,
  ) {
    // Students read their own invoice; amounts never leak across students
    // or to academic roles (Part 3A field boundaries).
    const studentSession = await this.liveAssignment(auth, 'STUDENT', 'study');
    if (!studentSession) {
      throw new HttpException(
        { message: 'This finance workspace is unavailable.' },
        403,
      );
    }
    const account = await this.prisma.account.findUnique({
      where: { id: auth.accountId },
    });
    if (!account) this.fail('NOT_FOUND', 'Student record not found.', 404);
    const student = await this.prisma.student.findUnique({
      where: { personId: account.personId },
    });
    if (!student) this.fail('NOT_FOUND', 'Student record not found.', 404);
    const period = periodCode
      ? await this.prisma.academicPeriod.findUnique({
          where: { code: periodCode },
        })
      : await this.prisma.academicPeriod.findUnique({
          where: { code: '2026S1' },
        });
    if (!period) this.fail('NOT_FOUND', 'Academic period not found.', 404);
    const financeAccount = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!financeAccount) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet.',
        404,
      );
    }
    const invoice = await this.prisma.financeInvoice.findUnique({
      where: {
        accountId_periodId: { accountId: financeAccount.id, periodId: period.id },
      },
      include: { lines: { include: { course: true } } },
    });
    if (!invoice) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet.',
        404,
      );
    }
    await this.prisma.auditEvent.create({
      data: {
        action: 'StudentInvoiceViewed',
        actorAccountId: auth.accountId,
        activeRole: 'STUDENT',
        scope: `FINANCE:${invoice.id}`,
        targetRef: invoice.id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Student finance self-service',
        metadata: json({ period: period.code }),
      },
    });
    return this.invoiceView(invoice, period.code);
  }

  private async ownInvoice(auth: FinanceAuthority, periodCode?: string) {
    const student = await this.studentOf(auth);
    const period = await this.periodOf(periodCode);
    const financeAccount = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!financeAccount) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet. Finance issues your invoice after registration.',
        404,
      );
    }
    const invoice = await this.prisma.financeInvoice.findUnique({
      where: {
        accountId_periodId: { accountId: financeAccount.id, periodId: period.id },
      },
      include: { lines: { include: { course: true } } },
    });
    if (!invoice) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet. Finance issues your invoice after registration.',
        404,
      );
    }
    return { student, period, invoice };
  }

  private async allocatedTotals(
    db: Tx,
    accountId: string,
    periodId: string,
  ): Promise<{
    paid: number;
    payments: Array<{
      reference: string;
      amountMinor: number;
      currency: string;
      method: string;
      status: string;
      confirmedAt: string;
    }>;
    allocations: Array<{
      chargeCode: string;
      chargeDescription: string;
      amountMinor: number;
    }>;
  }> {
    const rows = await db.financeAllocation.findMany({
      where: { accountId, chargeLine: { invoice: { accountId, periodId } } },
      include: {
        chargeLine: true,
        paymentTransaction: { include: { request: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const seen = new Map<string, (typeof rows)[number]['paymentTransaction']>();
    let paid = 0;
    const allocations = rows.map((a) => {
      paid += a.amountMinor;
      if (!seen.has(a.paymentTransactionId))
        seen.set(a.paymentTransactionId, a.paymentTransaction);
      return {
        chargeCode: a.chargeLine.code,
        chargeDescription: a.chargeLine.description,
        amountMinor: a.amountMinor,
      };
    });
    const payments = [...seen.values()].map((tx) => ({
      reference: tx.request?.reference ?? tx.providerRef,
      amountMinor: tx.amountMinor,
      currency: tx.currency,
      method: tx.channel,
      status: 'CONFIRMED',
      confirmedAt: tx.createdAt.toISOString(),
    }));
    return { paid, payments, allocations };
  }

  async accountSummary(auth: FinanceAuthority, periodCode?: string) {
    const { student, period, invoice } = await this.ownInvoice(
      auth,
      periodCode,
    );
    const clearance = await this.prisma.financeClearance.findUnique({
      where: {
        studentId_periodId: { studentId: student.id, periodId: period.id },
      },
    });
    const status = clearance?.status ?? 'NOT_ASSESSED';
    const total = invoice.lines.reduce((sum, l) => sum + l.amountMinor, 0);
    const { paid } = await this.allocatedTotals(
      this.prisma,
      invoice.accountId,
      period.id,
    );
    const outstanding = Math.max(0, total - paid);
    const cleared = status === 'CLEARED';
    await this.prisma.auditEvent.create({
      data: {
        action: 'StudentFinanceAccountViewed',
        actorAccountId: auth.accountId,
        activeRole: 'STUDENT',
        scope: `FINANCE:${invoice.id}`,
        targetRef: invoice.id,
        outcome: 'ALLOW',
        correlationId: randomUUID(),
        policyVersion: policy.version,
        purpose: 'Student finance self-service',
        metadata: json({ period: period.code }),
      },
    });
    return {
      studentNumber: student.studentNumber,
      period: period.code,
      clearanceStatus: status,
      clearanceWording: this.clearanceWording(status),
      outstandingMinor: outstanding,
      currency: policy.currency,
      blocksRegistration: !cleared,
      nextAction: this.nextActionFor(status),
      dueAt: invoice.dueAt ? invoice.dueAt.toISOString() : null,
      sponsorship:
        'No confirmed sponsorship is currently linked to this period',
      refreshedAt: new Date().toISOString(),
      supportRoute: 'Student Finance office',
    };
  }

  async statement(auth: FinanceAuthority, periodCode?: string) {
    const { invoice, period } = await this.ownInvoice(auth, periodCode);
    const lines = [...invoice.lines]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((l) => ({
        id: l.id,
        kind: 'CHARGE',
        description: l.description,
        amountMinor: l.amountMinor,
        currency: l.currency,
        status: l.status,
        createdAt: l.createdAt.toISOString(),
      }));
    const invoiced = lines.reduce((sum, l) => sum + l.amountMinor, 0);
    const allocated = await this.allocatedTotals(
      this.prisma,
      invoice.accountId,
      period.id,
    );
    return {
      reference: invoice.reference,
      period: period.code,
      lines,
      payments: allocated.payments,
      allocations: allocated.allocations,
      invoicedMinor: invoiced,
      paidMinor: allocated.paid,
      outstandingMinor: Math.max(0, invoiced - allocated.paid),
      currency: policy.currency,
    };
  }

  async receipt(auth: FinanceAuthority, reference: string) {
    const student = await this.studentOf(auth);
    const row = await this.prisma.financePaymentRequest.findUnique({
      where: { reference },
      include: {
        account: true,
        invoice: true,
        transactions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (
      !row ||
      row.account.studentId !== student.id ||
      row.status !== 'CONFIRMED'
    ) {
      this.fail(
        'RECEIPT_NOT_FOUND',
        'No receipt matches this reference in your record.',
        404,
        { reference },
      );
    }
    const posted = row.transactions.find((t) => t.status === 'POSTED');
    const allocated = await this.allocatedTotals(
      this.prisma,
      row.accountId,
      row.invoice.periodId,
    );
    return {
      reference: row.reference,
      invoiceReference: row.invoice.reference,
      amountMinor: row.amountMinor,
      currency: row.currency,
      method: row.method,
      status: row.status,
      confirmedAt: row.updatedAt.toISOString(),
      providerRef: posted?.providerRef ?? null,
      allocations: allocated.allocations,
    };
  }

  private methodKeys(): string[] {
    return (policy.methods as unknown as Array<{ key: string }>).map(
      (m) => m.key,
    );
  }

  private scenarioKeys(): string[] {
    return [
      ...((policy.simulator as unknown as { scenarios: string[] }).scenarios),
    ];
  }

  private requestView(row: {
    reference: string;
    status: string;
    amountMinor: number;
    currency: string;
    method: string;
    expiresAt: Date;
    createdAt: Date;
  }) {
    return {
      reference: row.reference,
      status: row.status,
      amountMinor: row.amountMinor,
      currency: row.currency,
      method: row.method,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async openRequest(
    db: Tx,
    invoiceId: string,
  ): Promise<{ reference: string; expiresAt: Date } | null> {
    const now = new Date();
    const open = await db.financePaymentRequest.findFirst({
      where: {
        invoiceId,
        status: {
          in: [
            'AWAITING_CONFIRMATION',
            'REPORTED',
            'INITIATED',
            'CASHIER_RECORDED',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!open) return null;
    if (open.expiresAt <= now) {
      await db.financePaymentRequest.update({
        where: { id: open.id },
        data: { status: 'EXPIRED' },
      });
      return null;
    }
    return { reference: open.reference, expiresAt: open.expiresAt };
  }

  private async invoiceOutstanding(
    db: Tx,
    invoice: { id: string; lines: Array<{ amountMinor: number }> },
  ): Promise<number> {
    void db;
    // Allocations arrive in slice 5; until then the posted total is due.
    return invoice.lines.reduce((sum, l) => sum + l.amountMinor, 0);
  }

  async initiatePayment(
    auth: FinanceAuthority,
    key: string,
    input: {
      period?: string;
      amountMinor?: number;
      method: string;
      scenario?: string;
    },
  ) {
    const student = await this.studentOf(auth);
    if (!this.methodKeys().includes(input.method)) {
      this.fail(
        'UNKNOWN_METHOD',
        'This payment method is not available. Choose an approved method.',
        400,
      );
    }
    if (input.scenario && !this.scenarioKeys().includes(input.scenario)) {
      this.fail(
        'UNKNOWN_SCENARIO',
        'This simulator scenario does not exist.',
        400,
      );
    }
    if (
      input.amountMinor !== undefined &&
      (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0)
    ) {
      this.fail(
        'INVALID_AMOUNT',
        'Enter a whole-tambala amount greater than zero.',
        400,
      );
    }
    const period = await this.periodOf(input.period);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet. Finance issues your invoice after registration.',
        404,
      );
    }
    const invoice = await this.prisma.financeInvoice.findUnique({
      where: {
        accountId_periodId: { accountId: account.id, periodId: period.id },
      },
      include: { lines: true },
    });
    if (!invoice) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet. Finance issues your invoice after registration.',
        404,
      );
    }
    const result = await this.command(
      auth,
      key,
      'InitiateStudentPayment',
      { accountId: account.id, period: period.code, ...input },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "FinanceAccount" WHERE id = ${account.id} FOR UPDATE`;
        const outstanding = await this.invoiceOutstanding(db, invoice);
        const amount = input.amountMinor ?? outstanding;
        if (amount <= 0 || !Number.isInteger(amount)) {
          this.fail(
            'INVALID_AMOUNT',
            'Enter a whole-tambala amount greater than zero.',
            400,
          );
        }
        if (amount > outstanding) {
          this.fail(
            'AMOUNT_EXCEEDS_BALANCE',
            'This amount is more than the outstanding balance. Adjust the amount and try again.',
            409,
            { outstandingMinor: outstanding },
          );
        }
        const open = await this.openRequest(db, invoice.id);
        if (open) {
          this.fail(
            'PAYMENT_IN_PROGRESS',
            `A payment attempt for this invoice is still being checked (${open.reference}). Do not pay again until the status is updated.`,
            409,
            { reference: open.reference },
          );
        }
        const ttl =
          (policy.simulator as unknown as { requestTtlMinutes: number })
            .requestTtlMinutes ?? 60;
        const seq = await db.$queryRaw<
          Array<{ n: bigint }>
        >`SELECT nextval('"PayNumberSeq"') AS n`;
        const reference = `PAY-${new Date().getUTCFullYear()}-${String(Number(seq[0].n)).padStart(4, '0')}`;
        const pseq = await db.$queryRaw<
          Array<{ n: bigint }>
        >`SELECT nextval('"ProviderRefSeq"') AS n`;
        const providerRef = `SIM-${new Date().getUTCFullYear()}-${String(Number(pseq[0].n)).padStart(6, '0')}`;
        const created = await db.financePaymentRequest.create({
          data: {
            accountId: account.id,
            invoiceId: invoice.id,
            reference,
            amountMinor: amount,
            currency: policy.currency,
            method: input.method,
            status: 'AWAITING_CONFIRMATION',
            idempotencyKey: key,
            simulatorScenario: input.scenario ?? 'SUCCESS',
            expiresAt: new Date(Date.now() + ttl * 60 * 1000),
          },
        });
        // The simulator stages provider evidence now; confirmation arrives
        // only through the signed callback path (slice 4). Staging is not
        // payment.
        await db.financePaymentTransaction.create({
          data: {
            requestId: created.id,
            accountId: account.id,
            provider: (
              policy.simulator as unknown as { provider: string }
            ).provider,
            providerRef,
            amountMinor: amount,
            currency: policy.currency,
            channel: input.method,
            status: 'STAGED',
            evidence: json({ scenario: created.simulatorScenario }),
          },
        });
        await this.audit(
          db,
          auth,
          'StudentPaymentInitiated',
          created.id,
          key,
          {
            reference,
            amountMinor: amount,
            method: input.method,
            scenario: created.simulatorScenario,
          },
        );
        const partial = amount < outstanding;
        return {
          body: {
            ...this.requestView(created),
            safeMessage:
              'We are checking your payment status. Do not pay again yet. Check this reference before trying again.',
            partialWarning: partial
              ? 'A partial payment may reduce your balance but will not complete financial clearance unless you have an approved payment arrangement.'
              : null,
          },
        };
      },
    );
    return result;
  }

  async reportPayment(
    auth: FinanceAuthority,
    key: string,
    input: {
      period?: string;
      amountMinor: number;
      method: string;
      payerReference: string;
    },
  ) {
    const student = await this.studentOf(auth);
    const offline = ['BANK_TRANSFER', 'CASHIER'];
    if (!offline.includes(input.method)) {
      this.fail(
        'REPORT_METHOD_NOT_OFFLINE',
        'Online methods confirm automatically; only bank or cashier payments are reported here.',
        400,
      );
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      this.fail(
        'INVALID_AMOUNT',
        'Enter a whole-tambala amount greater than zero.',
        400,
      );
    }
    if (!input.payerReference.trim()) {
      this.fail('EMPTY_REFERENCE', 'Enter the bank or cashier reference.', 400);
    }
    const period = await this.periodOf(input.period);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet.',
        404,
      );
    }
    const invoice = await this.prisma.financeInvoice.findUnique({
      where: {
        accountId_periodId: { accountId: account.id, periodId: period.id },
      },
      include: { lines: true },
    });
    if (!invoice) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet.',
        404,
      );
    }
    const result = await this.command(
      auth,
      key,
      'ReportOfflineStudentPayment',
      { accountId: account.id, period: period.code, ...input },
      async (db) => {
        await db.$queryRaw`SELECT id FROM "FinanceAccount" WHERE id = ${account.id} FOR UPDATE`;
        const open = await this.openRequest(db, invoice.id);
        if (open) {
          this.fail(
            'PAYMENT_IN_PROGRESS',
            `A payment attempt for this invoice is still being checked (${open.reference}). Do not pay again until the status is updated.`,
            409,
            { reference: open.reference },
          );
        }
        const ttl =
          (policy.simulator as unknown as { requestTtlMinutes: number })
            .requestTtlMinutes ?? 60;
        const seq = await db.$queryRaw<
          Array<{ n: bigint }>
        >`SELECT nextval('"PayNumberSeq"') AS n`;
        const reference = `PAY-${new Date().getUTCFullYear()}-${String(Number(seq[0].n)).padStart(4, '0')}`;
        // Reporting is not paying: the record waits for reconciliation and
        // changes neither balance nor clearance.
        const created = await db.financePaymentRequest.create({
          data: {
            accountId: account.id,
            invoiceId: invoice.id,
            reference,
            amountMinor: input.amountMinor,
            currency: policy.currency,
            method: input.method,
            status: 'REPORTED',
            idempotencyKey: key,
            payerReference: input.payerReference.trim(),
            expiresAt: new Date(Date.now() + ttl * 60 * 1000),
          },
        });
        await this.audit(db, auth, 'StudentPaymentReported', created.id, key, {
          reference,
          method: input.method,
        });
        return {
          body: {
            ...this.requestView(created),
            safeMessage:
              'Payment reported; reconciliation pending. Finance will match your reference before anything is confirmed. Do not pay again yet.',
          },
        };
      },
    );
    return result;
  }

  async listPayments(auth: FinanceAuthority, periodCode?: string) {
    const student = await this.studentOf(auth);
    const period = await this.periodOf(periodCode);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account) return { items: [] };
    const rows = await this.prisma.financePaymentRequest.findMany({
      where: {
        accountId: account.id,
        invoice: { periodId: period.id },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map((r) => this.requestView(r)) };
  }

  private async accountForAttempt(
    db: Tx,
    attemptId: string,
  ): Promise<{ accountId: string; periodId: string; studentId: string }> {
    const attempt = await db.programmeAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) this.fail('NOT_FOUND', 'Programme attempt not found.', 404);
    const period = await db.academicPeriod.findUnique({
      where: { code: '2026S1' },
    });
    if (!period) this.fail('NOT_FOUND', 'Academic period not found.', 404);
    let account = await db.financeAccount.findUnique({
      where: { studentId: attempt.studentId },
    });
    if (!account) {
      account = await db.financeAccount.create({
        data: { studentId: attempt.studentId },
      });
    }
    return { accountId: account.id, periodId: period.id, studentId: attempt.studentId };
  }

  async recordSponsorship(
    auth: FinanceAuthority,
    key: string,
    input: {
      attemptId: string;
      period?: string;
      sponsorName: string;
      categories: string[];
      coverageType: string;
      coverageValue: number;
      evidenceNote?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    },
  ) {
    await this.financeOfficer(auth, 'record-sponsorship');
    if (!input.sponsorName.trim()) {
      this.fail('EMPTY_SPONSOR', 'Name the sponsoring organisation.', 400);
    }
    const allowed = (
      policy.approvals as unknown as { sponsorCategories: string[] }
    ).sponsorCategories;
    if (
      !Array.isArray(input.categories) ||
      input.categories.length === 0 ||
      !input.categories.every((c) => allowed.includes(c))
    ) {
      this.fail(
        'UNKNOWN_CATEGORY',
        'Sponsorship covers configured fee categories only.',
        400,
      );
    }
    if (!['AMOUNT', 'PERCENT'].includes(input.coverageType)) {
      this.fail(
        'UNKNOWN_COVERAGE',
        'Coverage is a fixed amount or a percentage.',
        400,
      );
    }
    if (!Number.isInteger(input.coverageValue) || input.coverageValue <= 0) {
      this.fail('INVALID_COVERAGE', 'Coverage must be a positive value.', 400);
    }
    if (
      input.coverageType === 'PERCENT' &&
      (input.coverageValue <= 0 || input.coverageValue > 100)
    ) {
      this.fail(
        'INVALID_COVERAGE',
        'Percentage coverage is between 1 and 100.',
        400,
      );
    }
    const result = await this.command(
      auth,
      key,
      'RecordSponsorship',
      { ...input },
      async (db) => {
        const scope = await this.accountForAttempt(db, input.attemptId);
        const period = input.period
          ? await db.academicPeriod.findUnique({
              where: { code: input.period },
            })
          : await db.academicPeriod.findUnique({
              where: { id: scope.periodId },
            });
        if (!period) this.fail('NOT_FOUND', 'Academic period not found.', 404);
        // Attested evidence confirms immediately; bare records wait.
        const confirmed =
          input.evidenceNote != null && input.evidenceNote.trim() !== '';
        const created = await db.financeSponsorship.create({
          data: {
            accountId: scope.accountId,
            periodId: period.id,
            sponsorName: input.sponsorName.trim(),
            categories: input.categories,
            coverageType: input.coverageType,
            coverageValue: input.coverageValue,
            status: confirmed ? 'CONFIRMED' : 'DRAFT',
            version: 1,
            evidenceNote: confirmed ? input.evidenceNote!.trim() : null,
            effectiveFrom: input.effectiveFrom
              ? new Date(input.effectiveFrom)
              : null,
            effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
            decidedByAccountId: confirmed ? auth.accountId : null,
            decidedAt: confirmed ? new Date() : null,
          },
        });
        if (confirmed) {
          await this.allocateAndAssess(
            db,
            scope.accountId,
            period.id,
            'SPONSORSHIP_CONFIRMED',
          );
        }
        await this.audit(db, auth, 'SponsorshipRecorded', created.id, key, {
          sponsor: created.sponsorName,
          status: created.status,
        });
        return {
          body: {
            id: created.id,
            status: created.status,
            version: created.version,
          },
        };
      },
    );
    return result;
  }

  async confirmSponsorship(auth: FinanceAuthority, key: string, id: string) {
    await this.financeOfficer(auth, 'record-sponsorship');
    const result = await this.command(
      auth,
      key,
      'ConfirmSponsorship',
      { id },
      async (db) => {
        const row = await db.financeSponsorship.findUnique({
          where: { id },
        });
        if (!row) this.fail('NOT_FOUND', 'Sponsorship not found.', 404);
        if (row.status === 'CONFIRMED') {
          return { body: { id: row.id, status: row.status, version: row.version } };
        }
        if (!row.evidenceNote) {
          this.fail(
            'EVIDENCE_REQUIRED',
            'Attach the sponsorship evidence reference before confirming.',
            400,
          );
        }
        const confirmed = await db.financeSponsorship.update({
          where: { id: row.id },
          data: {
            status: 'CONFIRMED',
            decidedByAccountId: auth.accountId,
            decidedAt: new Date(),
          },
        });
        await this.allocateAndAssess(
          db,
          row.accountId,
          row.periodId,
          'SPONSORSHIP_CONFIRMED',
        );
        await this.audit(db, auth, 'SponsorshipConfirmed', row.id, key, {});
        return {
          body: {
            id: confirmed.id,
            status: confirmed.status,
            version: confirmed.version,
          },
        };
      },
    );
    return result;
  }

  async updateSponsorship(
    auth: FinanceAuthority,
    key: string,
    id: string,
    input: { coverageValue?: number; evidenceNote?: string; effectiveTo?: string },
  ) {
    await this.financeOfficer(auth, 'record-sponsorship');
    const result = await this.command(
      auth,
      key,
      'UpdateSponsorship',
      { id, ...input },
      async (db) => {
        const row = await db.financeSponsorship.findUnique({
          where: { id },
        });
        if (!row) this.fail('NOT_FOUND', 'Sponsorship not found.', 404);
        // Changes create versions and return the record to draft.
        const updated = await db.financeSponsorship.update({
          where: { id: row.id },
          data: {
            coverageValue: input.coverageValue ?? row.coverageValue,
            evidenceNote: input.evidenceNote ?? row.evidenceNote,
            effectiveTo: input.effectiveTo
              ? new Date(input.effectiveTo)
              : row.effectiveTo,
            version: { increment: 1 },
            status: 'DRAFT',
            decidedByAccountId: null,
            decidedAt: null,
          },
        });
        await this.allocateAndAssess(
          db,
          row.accountId,
          row.periodId,
          'SPONSORSHIP_CHANGED',
        );
        await this.audit(db, auth, 'SponsorshipUpdated', row.id, key, {
          version: updated.version,
        });
        return {
          body: {
            id: updated.id,
            status: updated.status,
            version: updated.version,
          },
        };
      },
    );
    return result;
  }

  async listSponsorships(auth: FinanceAuthority, attemptId?: string) {
    const officer = await this.liveAssignment(
      auth,
      'FINANCE_OFFICER',
      'record-sponsorship',
    );
    if (officer && auth.activeRole === 'FINANCE_OFFICER') {
      const rows = await this.prisma.financeSponsorship.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          sponsorName: r.sponsorName,
          status: r.status,
          version: r.version,
        })),
      };
    }
    const student = await this.studentOf(auth);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account) return { items: [] };
    const rows = await this.prisma.financeSponsorship.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
    // Students see coverage status, never internal budget notes.
    return {
      items: rows.map((r) => ({
        id: r.id,
        sponsorName: r.sponsorName,
        status: r.status,
        coverage:
          r.status === 'CONFIRMED'
            ? 'Sponsorship has been applied to eligible charges'
            : r.status === 'DRAFT'
              ? 'Funding information was received; Finance is reviewing it'
              : 'Sponsorship does not currently apply to this period',
      })),
    };
  }

  async requestAdjustment(
    auth: FinanceAuthority,
    key: string,
    input: {
      attemptId: string;
      period?: string;
      kind: string;
      amountMinor: number;
      reason: string;
      evidenceNote?: string;
    },
  ) {
    await this.financeOfficer(auth, 'reconcile-case');
    if (!['CREDIT_NOTE', 'WAIVER', 'REFUND'].includes(input.kind)) {
      this.fail(
        'UNKNOWN_KIND',
        'Adjustments are credit notes, waivers or refunds.',
        400,
      );
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      this.fail('INVALID_AMOUNT', 'Adjustments must be positive amounts.', 400);
    }
    if (!input.reason.trim()) {
      this.fail('EMPTY_REASON', 'State the reason for this adjustment.', 400);
    }
    const highValue = (
      policy.approvals as unknown as { highValueMinor: number }
    ).highValueMinor;
    if (
      input.amountMinor > highValue &&
      (input.evidenceNote == null || input.evidenceNote.trim() === '')
    ) {
      this.fail(
        'EVIDENCE_REQUIRED',
        'High-value adjustments require an evidence reference.',
        400,
      );
    }
    const result = await this.command(
      auth,
      key,
      'RequestFinanceAdjustment',
      { ...input },
      async (db) => {
        const scope = await this.accountForAttempt(db, input.attemptId);
        const period = input.period
          ? await db.academicPeriod.findUnique({
              where: { code: input.period },
            })
          : await db.academicPeriod.findUnique({
              where: { id: scope.periodId },
            });
        if (!period) this.fail('NOT_FOUND', 'Academic period not found.', 404);
        const created = await db.financeAdjustment.create({
          data: {
            accountId: scope.accountId,
            periodId: period.id,
            kind: input.kind,
            amountMinor: input.amountMinor,
            currency: policy.currency,
            reason: input.reason.trim(),
            evidenceNote: input.evidenceNote?.trim() || null,
            status: 'REQUESTED',
            policyVersion: policy.version,
            requesterAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'FinanceAdjustmentRequested', created.id, key, {
          kind: created.kind,
          amountMinor: created.amountMinor,
        });
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result;
  }

  async decideAdjustment(
    auth: FinanceAuthority,
    key: string,
    id: string,
    input: { approve: boolean; note?: string; payoutReference?: string },
  ) {
    await this.financeApprover(auth);
    const result = await this.command(
      auth,
      key,
      input.approve ? 'ApproveFinanceAdjustment' : 'DeclineFinanceAdjustment',
      { id, ...input },
      async (db) => {
        const row = await db.financeAdjustment.findUnique({
          where: { id },
          include: { account: true },
        });
        if (!row) this.fail('NOT_FOUND', 'Adjustment not found.', 404);
        if (row.status !== 'REQUESTED') {
          this.fail('REQUEST_CLOSED', 'This adjustment is already decided.', 409);
        }
        // Maker/checker: the requester can never decide their own case.
        if (row.requesterAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message:
                'The requesting officer cannot approve their own adjustment.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        if (!input.approve) {
          if (!input.note?.trim()) {
            this.fail('NOTE_REQUIRED', 'Declines require a reason.', 400);
          }
          const declined = await db.financeAdjustment.update({
            where: { id: row.id },
            data: {
              status: 'REJECTED',
              deciderAccountId: auth.accountId,
              decidedAt: new Date(),
            },
          });
          await this.audit(db, auth, 'FinanceAdjustmentDeclined', row.id, key, {
            note: input.note!.trim(),
          });
          return { body: { id: declined.id, status: declined.status } };
        }
        if (row.kind === 'REFUND' && !input.payoutReference?.trim()) {
          this.fail(
            'PAYOUT_REQUIRED',
            'Approved refunds record a payout reference.',
            400,
          );
        }
        // Approved credits post compensating lines; history is never edited.
        const invoice = await db.financeInvoice.findFirst({
          where: { accountId: row.accountId, periodId: row.periodId },
        });
        if (!invoice) {
          this.fail(
            'NO_INVOICE',
            'There is no invoice to adjust for this period.',
            409,
          );
        }
        await db.financeChargeLine.create({
          data: {
            invoiceId: invoice.id,
            code: row.kind === 'REFUND' ? 'REFUND_CREDIT' : 'ADJUSTMENT_CREDIT',
            description: `${row.kind} approved: ${row.reason}`,
            amountMinor: -row.amountMinor,
            currency: row.currency,
            feeRule: 'APPROVED_FINANCE_ADJUSTMENT',
            policyVersion: policy.version,
            inputs: json({ adjustmentId: row.id }),
            status: 'POSTED',
          },
        });
        const decided = await db.financeAdjustment.update({
          where: { id: row.id },
          data: {
            status: row.kind === 'REFUND' ? 'PAID' : 'APPROVED',
            deciderAccountId: auth.accountId,
            decidedAt: new Date(),
            payoutReference:
              row.kind === 'REFUND' ? input.payoutReference!.trim() : null,
          },
        });
        await this.allocateAndAssess(
          db,
          row.accountId,
          row.periodId,
          'ADJUSTMENT_APPROVED',
        );
        await this.audit(db, auth, 'FinanceAdjustmentApproved', row.id, key, {
          kind: row.kind,
          amountMinor: row.amountMinor,
          note: input.note?.trim() || null,
          chargeNote:
            'Compensating credit posted; original lines untouched.',
        });
        return { body: { id: decided.id, status: decided.status } };
      },
    );
    return result;
  }

  async listAdjustments(auth: FinanceAuthority) {
    const officer = await this.liveAssignment(
      auth,
      'FINANCE_OFFICER',
      'reconcile-case',
    );
    const approver = await this.liveAssignment(
      auth,
      'FINANCE_APPROVER',
      'approve-adjustment',
    );
    const active =
      (officer && auth.activeRole === 'FINANCE_OFFICER') ||
      (approver && auth.activeRole === 'FINANCE_APPROVER');
    if (!active) {
      throw new HttpException(
        { message: 'This finance workspace is unavailable.' },
        403,
      );
    }
    const rows = await this.prisma.financeAdjustment.findMany({
      where: { status: 'REQUESTED' },
      orderBy: { createdAt: 'asc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        amountMinor: r.amountMinor,
        currency: r.currency,
        reason: r.reason,
        status: r.status,
      })),
    };
  }

  async requestArrangement(
    auth: FinanceAuthority,
    key: string,
    input: { period?: string; terms: string; reason: string },
  ) {
    const student = await this.studentOf(auth);
    if (!input.terms.trim() || !input.reason.trim()) {
      this.fail(
        'INCOMPLETE_REQUEST',
        'Describe the requested terms and the reason.',
        400,
      );
    }
    const period = await this.periodOf(input.period);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account) {
      this.fail(
        'INVOICE_NOT_READY',
        'No invoice has been issued for this period yet.',
        404,
      );
    }
    const result = await this.command(
      auth,
      key,
      'RequestPaymentArrangement',
      { period: period.code, ...input },
      async (db) => {
        const open = await db.financeArrangement.findFirst({
          where: {
            accountId: account.id,
            periodId: period.id,
            status: 'REQUESTED',
          },
        });
        if (open) {
          this.fail(
            'DUPLICATE_TASK',
            'An arrangement request is already under review.',
            409,
            { arrangementId: open.id },
          );
        }
        const created = await db.financeArrangement.create({
          data: {
            accountId: account.id,
            periodId: period.id,
            terms: input.terms.trim(),
            reason: input.reason.trim(),
            status: 'REQUESTED',
            policyVersion: policy.version,
            requesterAccountId: auth.accountId,
          },
        });
        await this.audit(db, auth, 'PaymentArrangementRequested', created.id, key, {});
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result;
  }

  async listArrangements(auth: FinanceAuthority) {
    const officer = await this.liveAssignment(
      auth,
      'FINANCE_OFFICER',
      'reconcile-case',
    );
    const approver = await this.liveAssignment(
      auth,
      'FINANCE_APPROVER',
      'approve-adjustment',
    );
    if (
      (officer && auth.activeRole === 'FINANCE_OFFICER') ||
      (approver && auth.activeRole === 'FINANCE_APPROVER')
    ) {
      const rows = await this.prisma.financeArrangement.findMany({
        where: { status: 'REQUESTED' },
        orderBy: { createdAt: 'asc' },
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          terms: r.terms,
          reason: r.reason,
          status: r.status,
        })),
      };
    }
    const student = await this.studentOf(auth);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account) return { items: [] };
    const rows = await this.prisma.financeArrangement.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        terms: r.terms,
        status: r.status,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      })),
    };
  }

  async decideArrangement(
    auth: FinanceAuthority,
    key: string,
    id: string,
    input: { approve: boolean; note?: string },
  ) {
    await this.financeApprover(auth);
    const result = await this.command(
      auth,
      key,
      input.approve ? 'ApprovePaymentArrangement' : 'DeclinePaymentArrangement',
      { id, ...input },
      async (db) => {
        const row = await db.financeArrangement.findUnique({
          where: { id },
        });
        if (!row) this.fail('NOT_FOUND', 'Arrangement not found.', 404);
        if (row.status !== 'REQUESTED') {
          this.fail(
            'REQUEST_CLOSED',
            'This arrangement is already decided.',
            409,
          );
        }
        if (row.requesterAccountId === auth.accountId) {
          throw new HttpException(
            {
              code: 'SOD_VIOLATION',
              message: 'The requester cannot decide their own arrangement.',
              supportReference: randomUUID(),
            },
            403,
          );
        }
        if (!input.approve && !input.note?.trim()) {
          this.fail('NOTE_REQUIRED', 'Declines require a reason.', 400);
        }
        const decided = await db.financeArrangement.update({
          where: { id: row.id },
          data: {
            status: input.approve ? 'APPROVED' : 'DECLINED',
            deciderAccountId: auth.accountId,
            decidedAt: new Date(),
            expiresAt: input.approve
              ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              : null,
          },
        });
        if (input.approve) {
          await this.allocateAndAssess(
            db,
            row.accountId,
            row.periodId,
            'ARRANGEMENT_APPROVED',
          );
        }
        await this.audit(
          db,
          auth,
          input.approve
            ? 'PaymentArrangementApproved'
            : 'PaymentArrangementDeclined',
          row.id,
          key,
          { note: input.note?.trim() || null },
        );
        return { body: { id: decided.id, status: decided.status } };
      },
    );
    return result;
  }

  async recordCashIntake(
    auth: FinanceAuthority,
    key: string,
    input: { requestReference: string; amountMinor: number; cashReceiptNo: string },
  ) {
    await this.financeOfficer(auth, 'reconcile-case');
    if (!input.cashReceiptNo.trim()) {
      this.fail('EMPTY_REFERENCE', 'Enter the cashier receipt number.', 400);
    }
    const result = await this.command(
      auth,
      key,
      'RecordCashIntake',
      { ...input },
      async (db) => {
        const row = await db.financePaymentRequest.findUnique({
          where: { reference: input.requestReference },
        });
        if (!row) this.fail('NOT_FOUND', 'Payment request not found.', 404);
        if (row.status !== 'REPORTED') {
          this.fail(
            'WRONG_STATE',
            'Cash intake records bank or cashier reports only.',
            409,
          );
        }
        if (row.amountMinor !== input.amountMinor) {
          this.fail(
            'CASH_MISMATCH',
            'The intake amount must match the reported amount.',
            409,
          );
        }
        const updated = await db.financePaymentRequest.update({
          where: { id: row.id },
          data: {
            status: 'CASHIER_RECORDED',
            payerReference: input.cashReceiptNo.trim(),
          },
        });
        await this.audit(db, auth, 'CashIntakeRecorded', row.id, key, {
          receiptNo: input.cashReceiptNo.trim(),
        });
        return { body: this.requestView(updated) };
      },
    );
    return result;
  }

  async confirmCashIntake(
    auth: FinanceAuthority,
    key: string,
    input: { requestReference: string },
  ) {
    await this.financeOfficer(auth, 'reconcile-case');
    const result = await this.command(
      auth,
      key,
      'ConfirmCashIntake',
      { ...input },
      async (db) => {
        const row = await db.financePaymentRequest.findUnique({
          where: { reference: input.requestReference },
          include: { invoice: true },
        });
        if (!row) this.fail('NOT_FOUND', 'Payment request not found.', 404);
        if (row.status !== 'CASHIER_RECORDED') {
          this.fail(
            'WRONG_STATE',
            'Only cashier-recorded intakes can be confirmed.',
            409,
          );
        }
        const receiptNo = row.payerReference ?? '';
        const clash = await db.financePaymentTransaction.findUnique({
          where: { providerRef: receiptNo },
        });
        if (clash) {
          this.fail(
            'DUPLICATE_TASK',
            'This cashier receipt is already recorded.',
            409,
          );
        }
        const tx = await db.financePaymentTransaction.create({
          data: {
            requestId: row.id,
            accountId: row.accountId,
            provider: 'CASHIER',
            providerRef: receiptNo,
            amountMinor: row.amountMinor,
            currency: row.currency,
            channel: row.method,
            status: 'POSTED',
            signatureValid: true,
            evidence: json({ cashierConfirmed: true }),
          },
        });
        await db.financePaymentRequest.update({
          where: { id: row.id },
          data: { status: 'CONFIRMED' },
        });
        await db.outboxEvent.create({
          data: {
            aggregate: 'FinancePayment',
            aggregateId: row.id,
            type: 'FinancePaymentPosted',
            payload: json({
              requestReference: row.reference,
              providerRef: receiptNo,
              amountMinor: row.amountMinor,
              currency: row.currency,
            }),
          },
        });
        await this.allocateAndAssess(
          db,
          row.accountId,
          row.invoice.periodId,
          'CASH_CONFIRMED',
        );
        await this.audit(db, auth, 'CashIntakeConfirmed', row.id, key, {
          receiptNo,
        });
        return { body: { id: tx.id, status: 'CONFIRMED' } };
      },
    );
    return result;
  }

  private async sponsorCover(
    db: Tx,
    accountId: string,
    periodId: string,
    invoiceTotal: number,
  ): Promise<number> {
    // Confirmed sponsorship counts as cover within its scope; a promise is
    // never cash, so only CONFIRMED rows count (slice 6 writes them).
    const now = new Date();
    const rows = await db.financeSponsorship.findMany({
      where: { accountId, periodId, status: 'CONFIRMED' },
    });
    let cover = 0;
    for (const row of rows) {
      if (row.effectiveFrom && row.effectiveFrom > now) continue;
      if (row.effectiveTo && row.effectiveTo <= now) continue;
      if (row.coverageType === 'PERCENT') {
        cover += Math.floor((invoiceTotal * row.coverageValue) / 100);
      } else {
        cover += row.coverageValue;
      }
    }
    return Math.min(cover, invoiceTotal);
  }

  private async financeOfficer(
    auth: FinanceAuthority,
    capability: string,
  ): Promise<void> {
    // Demo role consolidation (noted in NOTE-PH5-006): cashier intake and
    // reconciliation ride the FINANCE_OFFICER role with distinct
    // capabilities until dedicated CASHIER/RECONCILIATION assignments land.
    const assignment = await this.liveAssignment(
      auth,
      'FINANCE_OFFICER',
      capability,
    );
    if (!assignment || auth.activeRole !== 'FINANCE_OFFICER') {
      throw new HttpException(
        { message: 'This finance workspace is unavailable.' },
        403,
      );
    }
  }

  private async financeApprover(auth: FinanceAuthority): Promise<void> {
    const assignment = await this.liveAssignment(
      auth,
      'FINANCE_APPROVER',
      'approve-adjustment',
    );
    if (!assignment || auth.activeRole !== 'FINANCE_APPROVER') {
      throw new HttpException(
        { message: 'This finance workspace is unavailable.' },
        403,
      );
    }
  }

  private caseView(
    row: {
      id: string;
      kind: string;
      status: string;
      providerRef: string | null;
      requestId: string | null;
      detail: unknown;
      createdAt: Date;
      resolvedAt: Date | null;
      account?: {
        student?: { studentNumber: string };
        invoices?: Array<{ period?: { code?: string } }>;
      } | null;
    },
    safe: boolean,
  ) {
    const detail = (row.detail ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      providerRef: row.providerRef,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      studentNumber: safe ? null : (row.account?.student?.studentNumber ?? null),
      safeMessage:
        (detail.safeNote as string | undefined) ??
        'Finance is reviewing this case. Do not pay again until it is resolved.',
    };
  }

  async listCases(auth: FinanceAuthority) {
    const officer = await this.liveAssignment(
      auth,
      'FINANCE_OFFICER',
      'reconcile-case',
    );
    if (officer && auth.activeRole === 'FINANCE_OFFICER') {
      const rows = await this.prisma.financeReconciliationCase.findMany({
        where: { status: { in: ['OPEN', 'ESCALATED'] } },
        orderBy: { createdAt: 'asc' },
        include: { account: { include: { student: true } } },
      });
      return { items: rows.map((r) => this.caseView(r, false)) };
    }
    // Students see their own cases with safe wording only.
    const student = await this.studentOf(auth);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account) return { items: [] };
    const rows = await this.prisma.financeReconciliationCase.findMany({
      where: { accountId: account.id, status: { in: ['OPEN', 'ESCALATED'] } },
      orderBy: { createdAt: 'asc' },
    });
    return { items: rows.map((r) => this.caseView(r, true)) };
  }

  async caseDetail(auth: FinanceAuthority, caseId: string) {
    const officer = await this.liveAssignment(
      auth,
      'FINANCE_OFFICER',
      'reconcile-case',
    );
    const row = await this.prisma.financeReconciliationCase.findUnique({
      where: { id: caseId },
      include: {
        account: {
          include: {
            student: true,
            invoices: {
              include: { period: true, lines: true },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });
    if (!row) this.fail('NOT_FOUND', 'Reconciliation case not found.', 404);
    if (officer && auth.activeRole === 'FINANCE_OFFICER') {
      const callbacks = await this.prisma.financeCallback.findMany({
        where: { providerRef: row.providerRef ?? undefined },
        orderBy: { receivedAt: 'asc' },
      });
      const allocations = row.accountId
        ? await this.prisma.financeAllocation.findMany({
            where: { accountId: row.accountId },
            include: { chargeLine: true },
            orderBy: { createdAt: 'asc' },
          })
        : [];
      return {
        ...this.caseView(row, false),
        detail: row.detail,
        callbacks: callbacks.map((c) => ({
          status: c.status,
          receivedAt: c.receivedAt.toISOString(),
        })),
        allocations: allocations.map((a) => ({
          chargeCode: a.chargeLine.code,
          amountMinor: a.amountMinor,
        })),
      };
    }
    const student = await this.studentOf(auth);
    const account = await this.prisma.financeAccount.findUnique({
      where: { studentId: student.id },
    });
    if (!account || row.accountId !== account.id) {
      this.fail('NOT_FOUND', 'Reconciliation case not found.', 404);
    }
    return this.caseView(row, true);
  }

  async resolveCase(
    auth: FinanceAuthority,
    key: string,
    caseId: string,
    input: {
      action: string;
      note?: string;
      requestReference?: string;
      acceptedAmountMinor?: number;
    },
  ) {
    await this.financeOfficer(auth, 'reconcile-case');
    if (
      !['MATCH_CONFIRM', 'MARK_DUPLICATE', 'ESCALATE'].includes(input.action)
    ) {
      this.fail(
        'UNKNOWN_ACTION',
        'Resolution actions are match, duplicate or escalate.',
        400,
      );
    }
    const result = await this.command(
      auth,
      key,
      'ResolveReconciliationCase',
      { caseId, ...input },
      async (db) => {
        const row = await db.financeReconciliationCase.findUnique({
          where: { id: caseId },
          include: { account: true },
        });
        if (!row) this.fail('NOT_FOUND', 'Reconciliation case not found.', 404);
        if (row.status !== 'OPEN' && row.status !== 'ESCALATED') {
          this.fail(
            'REQUEST_CLOSED',
            'This case is already resolved.',
            409,
          );
        }
        if (row.accountId) {
          await db.$queryRaw`SELECT id FROM "FinanceAccount" WHERE id = ${row.accountId} FOR UPDATE`;
        }
        if (input.action === 'ESCALATE') {
          const escalated = await db.financeReconciliationCase.update({
            where: { id: row.id },
            data: { status: 'ESCALATED' },
          });
          await this.audit(db, auth, 'ReconciliationCaseEscalated', row.id, key, {
            note: input.note?.trim() || null,
          });
          return { body: this.caseView(escalated, false) };
        }
        if (input.action === 'MARK_DUPLICATE') {
          // History preserved; no money moves.
          const closed = await db.financeReconciliationCase.update({
            where: { id: row.id },
            data: { status: 'RESOLVED', resolvedAt: new Date() },
          });
          await this.audit(db, auth, 'ReconciliationCaseDuplicate', row.id, key, {
            note: input.note?.trim() || null,
          });
          return { body: this.caseView(closed, false) };
        }
        // MATCH_CONFIRM: accept provider evidence at its stated amount.
        const detail = (row.detail ?? {}) as Record<string, unknown>;
        const received =
          typeof detail.receivedMinor === 'number'
            ? (detail.receivedMinor as number)
            : null;
        const accepted = input.acceptedAmountMinor ?? received;
        if (!accepted || accepted <= 0 || !Number.isInteger(accepted)) {
          this.fail(
            'AMOUNT_REQUIRED',
            'Name the confirmed amount from the provider evidence.',
            400,
          );
        }
        if (received != null && accepted !== received) {
          this.fail(
            'AMOUNT_MISMATCH',
            'Confirmation must match the provider evidence amount.',
            400,
          );
        }
        let request = row.requestId
          ? await db.financePaymentRequest.findUnique({
              where: { id: row.requestId },
              include: { transactions: true },
            })
          : null;
        if (!request) {
          // Unmatched money: the officer names the owning request.
          if (!input.requestReference) {
            this.fail(
              'REQUEST_REQUIRED',
              'Name the payment request this money belongs to.',
              400,
            );
          }
          request = await db.financePaymentRequest.findUnique({
            where: { reference: input.requestReference },
            include: { transactions: true },
          });
          if (!request) {
            this.fail(
              'UNKNOWN_REQUEST',
              'No payment request matches this reference.',
              400,
            );
          }
        }
        let tx = await db.financePaymentTransaction.findUnique({
          where: { providerRef: row.providerRef ?? '' },
        });
        if (!tx) {
          tx = await db.financePaymentTransaction.create({
            data: {
              requestId: request.id,
              accountId: request.accountId,
              provider: 'FIN-SIM-v1',
              providerRef: row.providerRef ?? `CASE-${row.id.slice(0, 8)}`,
              amountMinor: accepted,
              currency: 'ZMW',
              channel: request.method,
              status: 'STAGED',
              signatureValid: true,
              evidence: json({ matchedCaseId: row.id }),
            },
          });
        } else if (tx.amountMinor !== accepted) {
          await db.financePaymentTransaction.update({
            where: { id: tx.id },
            data: { amountMinor: accepted },
          });
          tx = await db.financePaymentTransaction.findUniqueOrThrow({
            where: { id: tx.id },
          });
        }
        await db.financePaymentRequest.update({
          where: { id: request.id },
          data: { status: 'CONFIRMED', amountMinor: accepted },
        });
        await db.financePaymentTransaction.update({
          where: { id: tx.id },
          data: { status: 'POSTED', signatureValid: true },
        });
        await db.outboxEvent.create({
          data: {
            aggregate: 'FinancePayment',
            aggregateId: request.id,
            type: 'FinancePaymentPosted',
            payload: json({
              requestReference: request.reference,
              providerRef: tx.providerRef,
              amountMinor: accepted,
              currency: 'ZMW',
              viaCase: row.id,
            }),
          },
        });
        const invoice = await db.financeInvoice.findFirst({
          where: { id: request.invoiceId },
        });
        if (invoice) {
          await this.allocateAndAssess(
            db,
            request.accountId,
            invoice.periodId,
            'CASE_MATCH',
          );
        }
        const closed = await db.financeReconciliationCase.update({
          where: { id: row.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        await this.audit(db, auth, 'ReconciliationCaseMatched', row.id, key, {
          requestReference: request.reference,
          acceptedMinor: accepted,
          note: input.note?.trim() || null,
        });
        return { body: this.caseView(closed, false) };
      },
    );
    return result;
  }

  async allocateAndAssess(
    db: Tx,
    accountId: string,
    periodId: string,
    trigger: string,
  ): Promise<string> {
    // Every verified payment allocates oldest-due-first under the
    // controlling policy version; the balance recomputes from posted
    // lines minus allocations, and clearance is then reassessed. The
    // (transaction, line) unique key makes reassessment idempotent.
    const lines = await db.financeChargeLine.findMany({
      where: {
        invoice: { accountId, periodId },
        status: 'POSTED',
      },
      orderBy: { createdAt: 'asc' },
    });
    const posted = await db.financePaymentTransaction.findMany({
      where: { accountId, status: 'POSTED' },
      orderBy: { createdAt: 'asc' },
      include: { allocations: true },
    });
    for (const tx of posted) {
      let remaining =
        tx.amountMinor -
        tx.allocations.reduce((sum, a) => sum + a.amountMinor, 0);
      if (remaining <= 0) continue;
      for (const line of lines) {
        if (remaining <= 0) break;
        const onLine = await db.financeAllocation.aggregate({
          where: { chargeLineId: line.id },
          _sum: { amountMinor: true },
        });
        const lineDue = line.amountMinor - (onLine._sum.amountMinor ?? 0);
        if (lineDue <= 0) continue;
        const take = Math.min(remaining, lineDue);
        await db.financeAllocation.upsert({
          where: {
            paymentTransactionId_chargeLineId: {
              paymentTransactionId: tx.id,
              chargeLineId: line.id,
            },
          },
          update: {},
          create: {
            accountId,
            paymentTransactionId: tx.id,
            chargeLineId: line.id,
            amountMinor: take,
            policyVersion: policy.version,
          },
        });
        remaining -= take;
      }
    }
    const invoice = await db.financeInvoice.findUnique({
      where: { accountId_periodId: { accountId, periodId } },
      include: { lines: true },
    });
    if (!invoice) return 'NOT_ASSESSED';
    const total = invoice.lines.reduce((sum, l) => sum + l.amountMinor, 0);
    const allocated = await db.financeAllocation.aggregate({
      where: {
        accountId,
        chargeLine: { invoice: { accountId, periodId } },
      },
      _sum: { amountMinor: true },
    });
    const paid = allocated._sum.amountMinor ?? 0;
    const cover = await this.sponsorCover(db, accountId, periodId, total);
    const openCases = await db.financeReconciliationCase.count({
      where: { accountId, status: 'OPEN' },
    });
    const reversals = await db.financePaymentTransaction.count({
      where: { accountId, status: 'REVERSED' },
    });
    const arrangement = await db.financeArrangement.findFirst({
      where: {
        accountId,
        periodId,
        status: 'APPROVED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { decidedAt: 'desc' },
    });
    const now = new Date();
    const pastDue = invoice.dueAt != null && invoice.dueAt <= now;
    let status: string;
    if (openCases > 0) {
      status = 'MANUAL_REVIEW';
    } else if (arrangement) {
      status = 'CLEARED';
    } else if (paid + cover >= total && total > 0) {
      status = 'CLEARED';
    } else if (paid + cover > 0 || total === 0) {
      status = paid + cover >= total ? 'CLEARED' : 'PENDING';
    } else if (reversals > 0 || pastDue) {
      status = 'HELD';
    } else {
      status = 'PENDING';
    }
    const account = await db.financeAccount.findUniqueOrThrow({
      where: { id: accountId },
    });
    const expiresAt =
      status === 'CLEARED'
        ? (arrangement?.expiresAt ??
          new Date(
            (policy.clearance as unknown as { expiresAt: string }).expiresAt,
          ))
        : null;
    await db.financeClearance.upsert({
      where: {
        studentId_periodId: { studentId: account.studentId, periodId },
      },
      update: { status, expiresAt, policyVersion: policy.version },
      create: {
        studentId: account.studentId,
        periodId,
        status,
        expiresAt,
        policyVersion: policy.version,
      },
    });
    // Hold loop: HELD applies a scoped finance hold; CLEARED releases
    // finance holds. Registration already blocks on both signals.
    if (status === 'HELD') {
      const existing = await db.hold.findFirst({
        where: {
          studentId: account.studentId,
          holdType: 'FINANCIAL_CLEARANCE',
          status: 'ACTIVE',
        },
      });
      if (!existing) {
        await db.hold.create({
          data: {
            studentId: account.studentId,
            holdType: 'FINANCIAL_CLEARANCE',
            effect: 'BLOCK_REGISTRATION',
            reason:
              'The current registration payment requirement is not yet met after a payment change.',
            office: 'Student Finance',
            status: 'ACTIVE',
          },
        });
      }
    } else if (status === 'CLEARED') {
      await db.hold.updateMany({
        where: {
          studentId: account.studentId,
          holdType: 'FINANCIAL_CLEARANCE',
          status: 'ACTIVE',
        },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }
    await this.audit(
      db,
      { accountId: account.studentId } as ActiveAuthority,
      'StudentFinancialClearanceAssessed',
      account.studentId,
      randomUUID(),
      { status, paidMinor: paid, trigger, policyVersion: policy.version },
    );
    return status;
  }

  async paymentDetail(auth: FinanceAuthority, reference: string) {
    const student = await this.studentOf(auth);
    const row = await this.prisma.financePaymentRequest.findUnique({
      where: { reference },
      include: { account: true, invoice: { include: { period: true } } },
    });
    if (!row || row.account.studentId !== student.id) {
      this.fail(
        'REQUEST_NOT_FOUND',
        'No payment request matches this reference in your record.',
        404,
        { reference },
      );
    }
    return {
      ...this.requestView(row),
      invoiceReference: row.invoice.reference,
      period: row.invoice.period.code,
      safeMessage:
        row.status === 'AWAITING_CONFIRMATION'
          ? 'We are checking your payment status. Do not pay again yet.'
          : row.status === 'REPORTED'
            ? 'Payment reported; reconciliation pending.'
            : row.status === 'CASHIER_RECORDED'
              ? 'Cashier recorded your payment; Finance will confirm it shortly.'
              : row.status === 'CONFIRMED'
              ? 'Payment confirmed.'
              : 'This request is closed. Start a new payment if you still owe this invoice.',
    };
  }

  private simulatorSecret(): string {
    const secret = process.env.FIN_SIM_SECRET;
    if (!secret) {
      throw new HttpException(
        {
          code: 'SIMULATOR_UNCONFIGURED',
          message: 'The payment simulator is not configured.',
        },
        503,
      );
    }
    return secret;
  }

  private callbackCanonical(body: {
    providerRef: string;
    requestReference?: string;
    amountMinor: number;
    currency: string;
    status: string;
    occurredAt: string;
    nonce: string;
  }): string {
    return [
      'FIN-SIM-v1',
      body.providerRef,
      body.requestReference ?? '',
      body.amountMinor,
      body.currency,
      body.status,
      body.occurredAt,
      body.nonce,
    ].join('|');
  }

  private signaturesEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ba.length !== bb.length) return false;
    let diff = 0;
    for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
    return diff === 0;
  }

  async processCallback(input: {
    provider: string;
    providerRef: string;
    requestReference?: string;
    amountMinor: number;
    currency: string;
    status: string;
    occurredAt: string;
    nonce: string;
    signature: string;
  }): Promise<{ outcome: string; reference?: string; caseId?: string }> {
    if (input.provider !== 'FIN-SIM-v1') {
      throw new HttpException(
        {
          code: 'UNKNOWN_PROVIDER',
          message: 'This payment provider is not recognized.',
          supportReference: randomUUID(),
        },
        400,
      );
    }
    if (!['SUCCESS', 'FAILED', 'REVERSED'].includes(input.status)) {
      throw new HttpException(
        {
          code: 'UNKNOWN_CALLBACK_STATUS',
          message: 'This callback status is not recognized.',
          supportReference: randomUUID(),
        },
        400,
      );
    }
    const expected = createHmac('sha256', this.simulatorSecret())
      .update(this.callbackCanonical(input))
      .digest('hex');
    if (!this.signaturesEqual(expected, input.signature)) {
      throw new HttpException(
        {
          code: 'INVALID_SIGNATURE',
          message: 'This callback could not be verified.',
          supportReference: randomUUID(),
        },
        400,
      );
    }
    const at = new Date(input.occurredAt).getTime();
    if (Number.isNaN(at) || Math.abs(Date.now() - at) > 15 * 60 * 1000) {
      throw new HttpException(
        {
          code: 'CALLBACK_STALE',
          message: 'This callback arrived outside the replay window.',
          supportReference: randomUUID(),
        },
        400,
      );
    }
    return this.prisma.$transaction(async (db) => {
      // Nonce-tracked exactly once: redelivery returns the stored outcome.
      const seen = await db.financeCallback.findUnique({
        where: {
          provider_nonce: { provider: input.provider, nonce: input.nonce },
        },
      });
      if (seen) {
        const prior = await db.financePaymentRequest.findFirst({
          where: {
            transactions: { some: { providerRef: seen.providerRef } },
          },
          orderBy: { createdAt: 'desc' },
        });
        return {
          outcome: seen.status,
          reference: prior?.reference,
        };
      }
      const mark = async (status: string) => {
        await db.financeCallback.create({
          data: {
            provider: input.provider,
            providerRef: input.providerRef,
            nonce: input.nonce,
            status,
          },
        });
      };
      const transaction = await db.financePaymentTransaction.findUnique({
        where: { providerRef: input.providerRef },
        include: { request: true, account: true },
      });
      if (!transaction || !transaction.request) {
        const opened = await db.financeReconciliationCase.create({
          data: {
            accountId: transaction?.accountId,
            kind: 'UNMATCHED',
            status: 'OPEN',
            providerRef: input.providerRef,
            detail: json({
              amountMinor: input.amountMinor,
              currency: input.currency,
              callbackStatus: input.status,
              safeNote:
                'We received a payment we cannot match yet. Do not pay again until Finance updates this case.',
            }),
          },
        });
        await mark('CASE_OPENED');
        return {
          outcome: 'CASE_OPENED',
          caseId: opened.id,
          safeMessage:
            'We received a payment we cannot match yet. Do not pay again until Finance updates this case.',
        };
      }
      const request = transaction.request;
      // Callbacks for spent requests never confirm: the request expires
      // and the money becomes governed review work.
      if (
        request.status !== 'CONFIRMED' &&
        request.expiresAt <= new Date() &&
        input.status === 'SUCCESS'
      ) {
        await db.financePaymentRequest.update({
          where: { id: request.id },
          data: { status: 'EXPIRED' },
        });
        const opened = await db.financeReconciliationCase.create({
          data: {
            accountId: transaction.accountId,
            requestId: request.id,
            kind: 'UNCERTAIN',
            status: 'OPEN',
            providerRef: input.providerRef,
            detail: json({
              callbackStatus: input.status,
              safeNote:
                'Your payment arrived after its request expired. Finance will confirm whether it applies. Do not pay again yet.',
            }),
          },
        });
        await mark('CASE_OPENED');
        await this.allocateAndAssess(
          db,
          transaction.accountId,
          (await db.financeInvoice.findFirstOrThrow({
            where: { id: request.invoiceId },
          })).periodId,
          'EXPIRED_CALLBACK',
        );
        return { outcome: 'CASE_OPENED', caseId: opened.id };
      }
      // Late terminal noise after confirmation becomes governed review,
      // never an automatic state change.
      if (request.status === 'CONFIRMED' && input.status !== 'REVERSED') {
        if (input.status === 'SUCCESS') {
          await mark('CONSUMED');
          return { outcome: 'DUPLICATE', reference: request.reference };
        }
        const opened = await db.financeReconciliationCase.create({
          data: {
            accountId: transaction.accountId,
            requestId: request.id,
            kind: 'DUPLICATE_REVIEW',
            status: 'OPEN',
            providerRef: input.providerRef,
            detail: json({
              callbackStatus: input.status,
              safeNote:
                'Finance is reviewing a payment linked to your account. Do not make another payment for this item until the review is complete.',
            }),
          },
        });
        await mark('CASE_OPENED');
        return {
          outcome: 'CASE_OPENED',
          caseId: opened.id,
          safeMessage:
            'Finance is reviewing a payment linked to your account. Do not make another payment for this item until the review is complete.',
        };
      }
      if (
        input.amountMinor !== transaction.amountMinor ||
        input.currency !== transaction.currency
      ) {
        const opened = await db.financeReconciliationCase.create({
          data: {
            accountId: transaction.accountId,
            requestId: request.id,
            kind: 'AMOUNT_MISMATCH',
            status: 'OPEN',
            providerRef: input.providerRef,
            detail: json({
              expectedMinor: transaction.amountMinor,
              receivedMinor: input.amountMinor,
              currency: input.currency,
              safeNote:
                'We received a payment linked to your account, but the amount requires review. Do not pay again until Finance updates this page.',
            }),
          },
        });
        await mark('CASE_OPENED');
        const mismatchInvoice = await db.financeInvoice.findFirst({
          where: { id: request.invoiceId },
        });
        if (mismatchInvoice) {
          await this.allocateAndAssess(
            db,
            transaction.accountId,
            mismatchInvoice.periodId,
            'MISMATCH_CASE',
          );
        }
        return {
          outcome: 'CASE_OPENED',
          caseId: opened.id,
          safeMessage:
            'We received a payment linked to your account, but the amount requires review. Do not pay again until Finance updates this page.',
        };
      }
      if (input.status === 'FAILED') {
        await db.financePaymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED', signatureValid: true },
        });
        await db.financePaymentRequest.update({
          where: { id: request.id },
          data: { status: 'FAILED' },
        });
        await mark('FAILED');
        await this.audit(
          db,
          { accountId: request.accountId } as ActiveAuthority,
          'StudentPaymentFailed',
          request.id,
          randomUUID(),
          { providerRef: input.providerRef },
        );
        return { outcome: 'FAILED', reference: request.reference };
      }
      if (input.status === 'REVERSED') {
        // Reversals are new events; the reversed transaction's allocations
        // are voided as the compensating effect, then clearance is
        // reassessed under policy (governed recalculation).
        await db.financeAllocation.deleteMany({
          where: { paymentTransactionId: transaction.id },
        });
        await db.financePaymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'REVERSED', signatureValid: true },
        });
        await db.financePaymentTransaction.create({
          data: {
            requestId: request.id,
            accountId: transaction.accountId,
            provider: input.provider,
            providerRef: `${input.providerRef}:reversal:${input.nonce.slice(0, 8)}`,
            amountMinor: transaction.amountMinor,
            currency: transaction.currency,
            channel: transaction.channel,
            status: 'REVERSED',
            signatureValid: true,
            evidence: json({ reversesProviderRef: input.providerRef }),
          },
        });
        await db.outboxEvent.create({
          data: {
            aggregate: 'FinancePayment',
            aggregateId: request.id,
            type: 'FinancePaymentReversed',
            payload: json({
              requestReference: request.reference,
              providerRef: input.providerRef,
            }),
          },
        });
        await mark('REVERSED');
        const reversedInvoice = await db.financeInvoice.findFirst({
          where: { id: request.invoiceId },
        });
        if (reversedInvoice) {
          await this.allocateAndAssess(
            db,
            transaction.accountId,
            reversedInvoice.periodId,
            'REVERSAL',
          );
        }
        await this.audit(
          db,
          { accountId: request.accountId } as ActiveAuthority,
          'StudentPaymentReversed',
          request.id,
          randomUUID(),
          { providerRef: input.providerRef },
        );
        return { outcome: 'REVERSED', reference: request.reference };
      }
      // Matched success: verify, post, confirm — exactly once.
      await db.financePaymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'POSTED', signatureValid: true },
      });
      await db.financePaymentRequest.update({
        where: { id: request.id },
        data: { status: 'CONFIRMED' },
      });
      await db.outboxEvent.create({
        data: {
          aggregate: 'FinancePayment',
          aggregateId: request.id,
          type: 'FinancePaymentPosted',
          payload: json({
            requestReference: request.reference,
            providerRef: input.providerRef,
            amountMinor: transaction.amountMinor,
            currency: transaction.currency,
          }),
        },
      });
      await mark('CONFIRMED');
      const confirmedInvoice = await db.financeInvoice.findFirst({
        where: { id: request.invoiceId },
      });
      if (confirmedInvoice) {
        await this.allocateAndAssess(
          db,
          transaction.accountId,
          confirmedInvoice.periodId,
          'PAYMENT_CONFIRMED',
        );
      }
      await this.audit(
        db,
        { accountId: request.accountId } as ActiveAuthority,
        'StudentPaymentConfirmed',
        request.id,
        randomUUID(),
        { providerRef: input.providerRef },
      );
      return { outcome: 'CONFIRMED', reference: request.reference };
    });
  }

  async simulatorDispatch(
    auth: FinanceAuthority,
    key: string,
    input: { requestReference: string; outcome?: string },
  ) {
    // Labelled demo control only: never active outside DEMO_MODE, and only
    // the owning student may drive their own request.
    if (process.env.DEMO_MODE !== 'true') {
      throw new HttpException({ message: 'Not found.' }, 404);
    }
    const student = await this.studentOf(auth);
    const row = await this.prisma.financePaymentRequest.findUnique({
      where: { reference: input.requestReference },
      include: { account: true, transactions: true },
    });
    if (!row || row.account.studentId !== student.id) {
      throw new HttpException({ message: 'Not found.' }, 404);
    }
    const staged =
      row.transactions.find((t) => t.status === 'STAGED') ??
      (input.outcome === 'REVERSAL'
        ? row.transactions.find((t) => t.status === 'POSTED')
        : undefined);
    if (!staged) {
      this.fail(
        'NOTHING_TO_DISPATCH',
        'This request has no staged simulator transaction.',
        409,
      );
    }
    const outcome = input.outcome ?? row.simulatorScenario ?? 'SUCCESS';
    const callbackStatus =
      outcome === 'REVERSAL'
        ? 'REVERSED'
        : outcome === 'FAILED'
          ? 'FAILED'
          : 'SUCCESS';
    const amountMinor =
      outcome === 'MISMATCH' ? staged.amountMinor + 100 : staged.amountMinor;
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference: row.reference,
      amountMinor,
      currency: staged.currency,
      status: callbackStatus,
      occurredAt: new Date().toISOString(),
      nonce: key,
    };
    const signature = createHmac('sha256', this.simulatorSecret())
      .update(this.callbackCanonical(body))
      .digest('hex');
    const result = await this.processCallback({ ...body, signature });
    const status = result.outcome === 'CASE_OPENED' ? 202 : 200;
    return { status, body: result };
  }
}
