import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { STUDENT_DEMO_V1 as policy } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface RecordsAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

// Phase 4 slice 2: student conversion (TASK-PH4-002). The records module owns
// Student identity, attempts, curriculum linkage and the duplicate queue. It
// never writes admissions, identity-credential, finance or Moodle tables;
// it reads applications, decisions, responses and onboarding tasks.
@Injectable()
export class RecordsService {
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
          'Review the current registry state, or contact the records office.',
        ...extra,
      },
      status,
    );
  }

  private async gate(
    auth: RecordsAuthority,
    mode: 'read' | 'write' = 'write',
  ): Promise<{ scopeType: string | null; scopeRef: string | null }> {
    if (!auth.assignmentId) {
      this.fail(
        'RECORDS_WORKSPACE',
        'Select a records workspace to continue.',
        403,
      );
    }
    const now = new Date();
    const officer = await this.prisma.roleAssignment.findFirst({
      where: {
        id: auth.assignmentId,
        accountId: auth.accountId,
        role: 'RECORDS_OFFICER',
        capabilities: { has: 'convert-student' },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
    });
    if (!officer || auth.activeRole !== 'RECORDS_OFFICER') {
      this.fail(
        'RECORDS_WORKSPACE',
        mode === 'read'
          ? 'This records workspace is unavailable.'
          : 'Select a records reviewer workspace to continue.',
        403,
      );
    }
    return { scopeType: officer.scopeType, scopeRef: officer.scopeRef };
  }

  private inScope(
    scopeType: string | null,
    scopeRef: string | null,
    intake: string,
  ): boolean {
    // Interim intake-string matching until GAP-004 lands. Fail-closed.
    if (scopeType !== 'INTAKE' || !scopeRef) return false;
    return intake.startsWith(scopeRef);
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
        activeRole: actor.activeRole ?? 'RECORDS_OFFICER',
        scope: `STUDENT:${id}`,
        targetRef: id,
        outcome,
        correlationId: randomUUID(),
        idempotencyRef: key,
        policyVersion: policy.version,
        purpose: 'Student records conversion',
        metadata: json(metadata),
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
                'This request reference belongs to a different action. Review the current registry state.',
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
      if (error instanceof HttpException) {
        const target =
          typeof payload === 'object' &&
          payload !== null &&
          'applicationId' in payload &&
          typeof (payload as { applicationId?: unknown }).applicationId ===
            'string'
            ? (payload as { applicationId: string }).applicationId
            : 'records-queue';
        await this.audit(this.prisma, actor, action, target, key, 'DENY', {
          status: error.getStatus(),
        }).catch(() => {});
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Lost a conversion race after the locks: the applicationId unique
        // index admitted exactly one attempt. Return the stored conversion.
        const target =
          typeof payload === 'object' &&
          payload !== null &&
          'applicationId' in payload &&
          typeof (payload as { applicationId?: unknown }).applicationId ===
            'string'
            ? (payload as { applicationId: string }).applicationId
            : null;
        if (target) {
          const attempt = await this.prisma.programmeAttempt.findUnique({
            where: { applicationId: target },
            include: { student: true, curriculumVersion: true },
          });
          if (attempt)
            return this.toStudent(
              attempt.student,
              attempt,
              attempt.curriculumVersion?.version ?? null,
            );
        }
      }
      this.fail(
        'SERVICE_UNAVAILABLE',
        'The records service could not confirm this action. Check the registry state before retrying the same request.',
        503,
      );
    }
  }

  private toStudent(
    student: {
      id: string;
      personId: string;
      studentNumber: string;
      status: string;
      createdAt: Date;
    },
    attempt: { id: string; applicationId: string; intake: string },
    curriculumVersion: number | null = null,
  ) {
    return {
      id: student.id,
      personId: student.personId,
      studentNumber: student.studentNumber,
      status: student.status,
      attemptId: attempt.id,
      applicationId: attempt.applicationId,
      intake: attempt.intake,
      curriculumVersion,
      createdAt: student.createdAt.toISOString(),
    };
  }

  private matchReason(
    person: { email: string | null; phone: string | null },
    candidate: { email: string | null; phone: string | null },
  ): string | null {
    const hits: string[] = [];
    if (person.email && candidate.email && person.email === candidate.email)
      hits.push('email address');
    if (person.phone && candidate.phone && person.phone === candidate.phone)
      hits.push('mobile number');
    if (hits.length === 0) return null;
    return `Same ${hits.join(' and ')} as another person record.`;
  }

  async convert(
    auth: RecordsAuthority,
    applicationId: string,
    key: string,
  ): Promise<unknown> {
    await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      'ConvertAcceptedOffer',
      { applicationId },
      async (db) => {
        const scope = await this.gate(auth);
        const app = await db.application.findFirst({
          where: { id: applicationId },
          include: {
            account: { include: { person: true } },
            offering: { include: { programme: true } },
          },
        });
        if (!app) this.fail('NOT_FOUND', 'Application not found.', 404);
        // Neutral: out-of-scope intakes look like missing applications.
        if (!this.inScope(scope.scopeType, scope.scopeRef, app.offering.intake))
          this.fail('NOT_FOUND', 'Application not found.', 404);
        if (app.state !== 'Submitted') {
          this.fail(
            'NOT_SUBMITTED',
            'Conversion needs a submitted application awaiting the registry.',
          );
        }
        const done = await db.programmeAttempt.findUnique({
          where: { applicationId },
          include: { student: true, curriculumVersion: true },
        });
        // Resource-idempotent: an existing conversion returns as stored.
        if (done)
          return {
            body: this.toStudent(
              done.student,
              done,
              done.curriculumVersion?.version ?? null,
            ),
          };
        const response = await db.applicationOfferResponse.findUnique({
          where: { applicationId },
        });
        if (!response || response.decision !== 'ACCEPT') {
          this.fail(
            'OFFER_NOT_ACCEPTED',
            'Conversion needs an accepted admission offer.',
            409,
          );
        }
        const decision = await db.applicationDecision.findUnique({
          where: { applicationId },
        });
        if (!decision || !decision.releasedAt) {
          this.fail(
            'OFFER_NOT_ACCEPTED',
            'Conversion needs a released admission decision.',
            409,
          );
        }
        const blocking = (
          Array.isArray(decision.conditions)
            ? (decision.conditions as Array<Record<string, unknown>>)
            : []
        ).find(
          (c) =>
            typeof c === 'object' &&
            c !== null &&
            (c as { blocksMatriculation?: unknown }).blocksMatriculation ===
              true,
        ) as { text?: unknown } | undefined;
        if (blocking) {
          this.fail(
            'CONDITION_BLOCKING',
            `A blocking condition is not met: ${typeof blocking.text === 'string' ? blocking.text : 'see the decision'}.`,
            409,
          );
        }
        // Applicant-side onboarding gate: required APPLICANT-owned tasks
        // must be complete. Institution-owned tasks (e.g. verification)
        // continue in parallel and gate registration, not conversion.
        const pendingTasks = await db.onboardingTask.findMany({
          where: {
            applicationId,
            required: true,
            owner: 'APPLICANT',
            status: { not: 'COMPLETED' },
          },
        });
        if (pendingTasks.length > 0) {
          this.fail(
            'ONBOARDING_INCOMPLETE',
            `Onboarding is incomplete: ${pendingTasks[0].title}.`,
            409,
          );
        }
        const curriculum = await db.curriculumVersion.findFirst({
          where: { programmeId: app.offering.programmeId, status: 'PUBLISHED' },
          orderBy: { version: 'desc' },
        });
        if (!curriculum) {
          this.fail(
            'NO_CURRICULUM',
            'No published curriculum exists for this programme.',
            409,
          );
        }
        // Identity resolution: a linked candidate redirects to the surviving
        // person; a separated pair is skipped; anything else matching blocks.
        const linked = await db.identityMatchCandidate.findFirst({
          where: { applicationId, status: 'LINKED' },
        });
        let person = app.account.person;
        if (linked) {
          const survivor = await db.person.findFirst({
            where: { id: linked.candidatePersonId, status: 'ACTIVE' },
          });
          if (!survivor)
            this.fail(
              'PERSON_NOT_ACTIVE',
              'The linked person record is no longer active.',
              409,
            );
          person = survivor;
        } else {
          const signals = (
            await db.person.findMany({
              where: {
                id: { not: person.id },
                status: 'ACTIVE',
                duplicateOfPersonId: null,
              },
            })
          ).filter((p) => this.matchReason(person, p) !== null);
          for (const candidate of signals) {
            const prior = await db.identityMatchCandidate.findFirst({
              where: {
                applicationId,
                personId: person.id,
                candidatePersonId: candidate.id,
              },
            });
            if (prior) {
              if (prior.status === 'PENDING') {
                this.fail(
                  'DUPLICATE_IDENTITY',
                  'A possible duplicate identity is awaiting registry review.',
                  409,
                  { candidateId: prior.id },
                );
              }
              continue;
            }
            // Autocommit outside the command transaction: the refusal below
            // rolls the command back, but the queued candidate must survive
            // it. The pair-unique index keeps concurrent races to one row.
            let queued: { id: string };
            try {
              queued = await this.prisma.identityMatchCandidate.create({
                data: {
                  applicationId,
                  personId: person.id,
                  candidatePersonId: candidate.id,
                  reason: this.matchReason(person, candidate) as string,
                  status: 'PENDING',
                },
                select: { id: true },
              });
            } catch (error) {
              if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
              ) {
                const raced =
                  await this.prisma.identityMatchCandidate.findFirst({
                    where: {
                      applicationId,
                      personId: person.id,
                      candidatePersonId: candidate.id,
                    },
                    select: { id: true, status: true },
                  });
                if (raced && raced.status === 'PENDING') {
                  this.fail(
                    'DUPLICATE_IDENTITY',
                    'A possible duplicate identity is awaiting registry review.',
                    409,
                    { candidateId: raced.id },
                  );
                }
                continue;
              }
              throw error;
            }
            this.fail(
              'DUPLICATE_IDENTITY',
              'A possible duplicate identity is awaiting registry review.',
              409,
              { candidateId: queued.id },
            );
          }
        }
        const seq = await db.$queryRaw<Array<{ n: bigint }>>`SELECT nextval('"StudentNumberSeq"') AS n`;
        const studentNumber = `${policy.studentNumberPrefix}${String(Number(seq[0].n)).padStart(4, '0')}`;
        // One human, one student record: a second admission for an already
        // converted person reuses the student and opens a new attempt.
        let student = await db.student.findUnique({
          where: { personId: person.id },
        });
        if (!student) {
          student = await db.student.create({
            data: {
              personId: person.id,
              studentNumber,
              status: 'ACTIVE',
            },
          });
        }
        const attempt = await db.programmeAttempt.create({
          data: {
            studentId: student.id,
            applicationId,
            offeringId: app.offeringId,
            intake: app.offering.intake,
            curriculumVersionId: curriculum.id,
            status: 'ADMITTED',
          },
        });
        await db.roleAssignment.create({
          data: {
            accountId: app.accountId,
            role: 'STUDENT',
            scopeType: 'STUDENT',
            scopeRef: student.studentNumber,
            capabilities: ['study'],
            reason: 'Offer acceptance conversion',
            startsAt: new Date(),
          },
        });
        await this.audit(db, auth, 'StudentConverted', student.id, key, 'ALLOW', {
          studentNumber: student.studentNumber,
          attemptId: attempt.id,
          applicationId,
          policyVersion: policy.version,
        });
        const body = this.toStudent(student, attempt, curriculum.version);
        return { body };
      },
    );
    return result;
  }

  async listCandidates(auth: RecordsAuthority) {
    await this.gate(auth, 'read');
    const rows = await this.prisma.identityMatchCandidate.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        applicationId: r.applicationId,
        personId: r.personId,
        candidatePersonId: r.candidatePersonId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async resolveMatch(
    auth: RecordsAuthority,
    candidateId: string,
    key: string,
    decision: string,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      'ResolveIdentityMatch',
      { candidateId, decision },
      async (db) => {
        await this.gate(auth);
        const candidate = await db.identityMatchCandidate.findFirst({
          where: { id: candidateId },
        });
        if (!candidate)
          this.fail('NOT_FOUND', 'Identity match not found.', 404);
        if (candidate.status !== 'PENDING') {
          this.fail(
            'REQUEST_CLOSED',
            'This identity match is already decided.',
            409,
          );
        }
        if (!reason.trim()) {
          this.fail(
            'EMPTY_REASON',
            'Record the evidence behind this identity decision.',
            400,
          );
        }
        if (decision === 'LINK_EXISTING') {
          await db.person.update({
            where: { id: candidate.personId },
            data: {
              status: 'DUPLICATE',
              duplicateOfPersonId: candidate.candidatePersonId,
            },
          });
        }
        const decided = await db.identityMatchCandidate.update({
          where: { id: candidate.id },
          data: {
            status: decision === 'LINK_EXISTING' ? 'LINKED' : 'SEPARATE',
            decidedByAccountId: auth.accountId,
            decidedAt: new Date(),
          },
        });
        await this.audit(
          db,
          auth,
          'IdentityMatchResolved',
          candidate.applicationId,
          key,
          'ALLOW',
          { candidateId: candidate.id, decision, reason: reason.trim() },
        );
        return { body: { id: decided.id, status: decided.status } };
      },
    );
    return result as { id: string; status: string };
  }

  private async studentGate(auth: RecordsAuthority): Promise<void> {
    if (!auth.assignmentId) {
      this.fail(
        'STUDENT_WORKSPACE',
        'Select your student workspace to continue.',
        403,
      );
    }
    const now = new Date();
    const live = await this.prisma.roleAssignment.findFirst({
      where: {
        id: auth.assignmentId,
        accountId: auth.accountId,
        role: 'STUDENT',
        capabilities: { has: 'study' },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
      select: { id: true },
    });
    if (!live || auth.activeRole !== 'STUDENT') {
      this.fail(
        'STUDENT_WORKSPACE',
        'This student workspace is unavailable. Sign in again or contact support.',
        403,
      );
    }
  }

  private async ownStudent(db: Tx, auth: ActiveAuthority) {
    const account = await db.account.findUnique({
      where: { id: auth.accountId },
      include: { person: true },
    });
    if (!account)
      this.fail('NOT_FOUND', 'Student record not found.', 404);
    const student = await db.student.findUnique({
      where: { personId: account.personId },
      include: {
        person: true,
        attempts: {
          orderBy: { createdAt: 'desc' },
          include: { offering: { include: { programme: true } } },
          take: 1,
        },
      },
    });
    if (!student)
      this.fail('NOT_FOUND', 'Student record not found.', 404);
    return { account, person: account.person, student };
  }

  async studentHome(auth: RecordsAuthority) {
    await this.studentGate(auth);
    const { person, student } = await this.ownStudent(
      this.prisma,
      auth,
    );
    const attempt = student.attempts[0];
    const applications = await this.prisma.application.findMany({
      where: { accountId: auth.accountId },
      select: { id: true },
    });
    const appIds = applications.map((a) => a.id);
    const onboardingRequiredTotal =
      appIds.length === 0
        ? 0
        : await this.prisma.onboardingTask.count({
            where: {
              applicationId: { in: appIds },
              required: true,
            },
          });
    const onboardingRequiredComplete =
      appIds.length === 0
        ? 0
        : await this.prisma.onboardingTask.count({
            where: {
              applicationId: { in: appIds },
              required: true,
              status: 'COMPLETED',
            },
          });
    const pendingCorrections = await this.prisma.studentCorrectionRequest.count(
      {
        where: { studentId: student.id, status: 'PENDING' },
      },
    );
    const period = await this.prisma.academicPeriod.findUnique({
      where: { code: policy.currentPeriod as string },
    });
    return {
      studentNumber: student.studentNumber,
      status: student.status,
      displayName: person.displayName,
      programmeName: attempt?.offering.programme.name ?? 'Unknown programme',
      intake: attempt?.offering.intake ?? 'Unknown intake',
      campus: attempt?.offering.campus ?? '',
      studyMode: attempt?.offering.studyMode ?? '',
      period: policy.currentPeriod as string,
      registrationOpensAt: period?.registrationOpen
        ? (period.registrationOpen as Date).toISOString()
        : null,
      registrationClosesAt: period?.registrationClose
        ? (period.registrationClose as Date).toISOString()
        : null,
      onboardingRequiredTotal,
      onboardingRequiredComplete,
      pendingCorrections,
    };
  }

  async getContact(auth: RecordsAuthority) {
    await this.studentGate(auth);
    const { person } = await this.ownStudent(this.prisma, auth);
    return {
      displayName: person.displayName,
      email: person.email,
      emailVerifiedAt: person.emailVerifiedAt
        ? (person.emailVerifiedAt as Date).toISOString()
        : null,
      phone: person.phone,
      phoneVerifiedAt: person.phoneVerifiedAt
        ? (person.phoneVerifiedAt as Date).toISOString()
        : null,
    };
  }

  async updateContact(
    auth: RecordsAuthority,
    key: string,
    input: { email?: string; phone?: string },
  ) {
    await this.studentGate(auth);
    const email = input.email?.trim() ? input.email.trim() : undefined;
    const phone = input.phone?.trim() ? input.phone.trim() : undefined;
    if (email === undefined && phone === undefined) {
      this.fail(
        'EMPTY_UPDATE',
        'Provide an email address or a mobile number to update.',
        400,
      );
    }
    const result = await this.command(
      auth,
      key,
      'UpdateStudentContact',
      { email: email ?? null, phone: phone ?? null },
      async (db) => {
        const { person, student } = await this.ownStudent(db, auth);
        const oldValue = { email: person.email, phone: person.phone };
        const data: Record<string, unknown> = {};
        if (email !== undefined && email !== person.email) {
          data.email = email;
          data.emailVerifiedAt = null;
        }
        if (phone !== undefined && phone !== person.phone) {
          data.phone = phone;
          data.phoneVerifiedAt = null;
        }
        if (Object.keys(data).length > 0) {
          await db.person.update({ where: { id: person.id }, data: data as never });
        }
        await this.audit(db, auth, 'StudentContactUpdated', student.id, key, 'ALLOW', {
          oldValue,
          newValue: { email: person.email, phone: person.phone, ...data },
        });
        const updated = await db.person.findUniqueOrThrow({
          where: { id: person.id },
        });
        return {
          body: {
            displayName: updated.displayName,
            email: updated.email,
            emailVerifiedAt: updated.emailVerifiedAt
              ? (updated.emailVerifiedAt as Date).toISOString()
              : null,
            phone: updated.phone,
            phoneVerifiedAt: updated.phoneVerifiedAt
              ? (updated.phoneVerifiedAt as Date).toISOString()
              : null,
          },
        };
      },
    );
    return result;
  }

  async requestCorrection(
    auth: RecordsAuthority,
    key: string,
    input: { field: string; requestedValue: string; reason: string },
  ) {
    await this.studentGate(auth);
    const result = await this.command(
      auth,
      key,
      'RequestStudentCorrection',
      { field: input.field },
      async (db) => {
        const { student } = await this.ownStudent(db, auth);
        const open = await db.studentCorrectionRequest.findFirst({
          where: {
            studentId: student.id,
            field: input.field,
            status: 'PENDING',
          },
        });
        if (open) {
          this.fail(
            'DUPLICATE_TASK',
            'An open correction request already covers this item.',
            409,
            { correctionId: open.id },
          );
        }
        if (!input.reason.trim()) {
          this.fail(
            'EMPTY_REASON',
            'Explain why the correction is needed.',
            400,
          );
        }
        const created = await db.studentCorrectionRequest.create({
          data: {
            studentId: student.id,
            field: input.field,
            requestedValue: input.requestedValue.trim(),
            reason: input.reason.trim(),
            status: 'PENDING',
          },
        });
        await this.audit(
          db,
          auth,
          'StudentCorrectionRequested',
          student.id,
          key,
          'ALLOW',
          { correctionId: created.id, field: input.field },
        );
        return { body: { id: created.id, status: created.status } };
      },
    );
    return result as { id: string; status: string };
  }

  async listCorrections(auth: RecordsAuthority) {
    await this.studentGate(auth);
    const { student } = await this.ownStudent(this.prisma, auth);
    const rows = await this.prisma.studentCorrectionRequest.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        field: r.field,
        requestedValue: r.requestedValue,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async decideCorrection(
    auth: RecordsAuthority,
    correctionId: string,
    key: string,
    approve: boolean,
    note?: string,
  ): Promise<{ id: string; status: string }> {
    await this.gate(auth);
    const result = await this.command(
      auth,
      key,
      approve
        ? 'ApproveStudentCorrection'
        : 'DeclineStudentCorrection',
      { correctionId, approve, note },
      async (db) => {
        await this.gate(auth);
        const correction = await db.studentCorrectionRequest.findFirst({
          where: { id: correctionId },
          include: { student: { include: { person: true } } },
        });
        if (!correction)
          this.fail('NOT_FOUND', 'Correction request not found.', 404);
        if (correction.status !== 'PENDING') {
          this.fail(
            'REQUEST_CLOSED',
            'This correction request is already decided.',
            409,
          );
        }
        const person = correction.student.person;
        const oldValue =
          correction.field === 'displayName'
            ? person.displayName
            : correction.field === 'email'
              ? person.email
              : person.phone;
        if (approve) {
          const data: Record<string, unknown> = {};
          if (correction.field === 'displayName')
            data.displayName = correction.requestedValue;
          if (correction.field === 'email') {
            data.email = correction.requestedValue;
            data.emailVerifiedAt = null;
          }
          if (correction.field === 'phone') {
            data.phone = correction.requestedValue;
            data.phoneVerifiedAt = null;
          }
          await db.person.update({
            where: { id: person.id },
            data: data as never,
          });
        }
        const decided = await db.studentCorrectionRequest.update({
          where: { id: correction.id },
          data: {
            status: approve ? 'APPROVED' : 'REJECTED',
            decidedByAccountId: auth.accountId,
            decidedAt: new Date(),
          },
        });
        await this.audit(
          db,
          auth,
          approve
            ? 'StudentCorrectionApproved'
            : 'StudentCorrectionDeclined',
          correction.studentId,
          key,
          'ALLOW',
          {
            correctionId: correction.id,
            field: correction.field,
            oldValue,
            approvedValue: approve ? correction.requestedValue : null,
            note: note?.trim() ?? null,
          },
        );
        return { body: { id: decided.id, status: decided.status } };
      },
    );
    return result as { id: string; status: string };
  }
}
