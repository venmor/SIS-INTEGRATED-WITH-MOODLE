import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isDemonstrationDatabaseTarget, SECURITY_V1 } from '@sis/config';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { PUBLICATION_DECLARATION, type PublicationPolicyProvider, type ResultStepUpVerifier } from './publication-ports.js';
const { verify } = createRequire(import.meta.url)('argon2') as typeof import('argon2');
type Actor = ActiveAuthority & { sessionToken: string };
type Tx = Prisma.TransactionClient;
const hash = (input: string) => createHash('sha256').update(input).digest('hex');
export const resultCommandDigest = (id: string, version: number, declaration: string) => hash(JSON.stringify({ id, version, declaration }));
export const resultDemoEnabled = () => process.env.SIS_ENABLE_RESULT_DEMO_POLICY === 'true' && isDemonstrationDatabaseTarget(process.env);
const fail = (code: string, message: string, status = 403): never => { throw new HttpException({ code, message, saved: false }, status); };

/** No institution-wide authority is created: only the user's pinned synthetic demonstration. */
export async function resultAuthority(db: Tx, actor: Actor, period: string, capability: string | string[]) {
  if (!resultDemoEnabled()) fail('DEMO_POLICY_DISABLED', 'Result demonstration controls are not enabled for this database.');
  const now = new Date();
  if (actor.assignmentId) await db.$queryRaw`SELECT id FROM "RoleAssignment" WHERE id = ${actor.assignmentId} FOR SHARE`;
  await db.$queryRaw`SELECT id FROM "Session" WHERE "tokenHash" = ${hash(actor.sessionToken)} FOR SHARE`;
  await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR SHARE`;
  if (actor.activeRole !== 'EXAMINATIONS_OFFICER' || !actor.assignmentId) fail('RESULT_AUTHORITY', 'Select the assigned examinations workspace.');
  const assignment = await db.roleAssignment.findFirst({ where: {
    id: actor.assignmentId!, accountId: actor.accountId, role: 'EXAMINATIONS_OFFICER', scopeType: 'PERIOD', scopeRef: period,
    capabilities: { hasSome: typeof capability === 'string' ? [capability] : capability }, revokedAt: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }], account: { status: 'ACTIVE' },
  } });
  const session = await db.session.findFirst({ where: { tokenHash: hash(actor.sessionToken), accountId: actor.accountId, activeAssignmentId: actor.assignmentId, revokedAt: null, expiresAt: { gt: now }, lastSeenAt: { gt: new Date(now.getTime() - SECURITY_V1.session.idleSeconds * 1000) } } });
  if (!assignment || !session) fail('RESULT_AUTHORITY', 'Your current result authority or session is unavailable.');
  return assignment!;
}

@Injectable()
export class ResultReleaseProofService implements ResultStepUpVerifier {
  constructor(private readonly prisma: PrismaService) {}
  async issue(actor: Actor, input: { targetId: string; version: number; declaration: string; action: string; password: string }) {
    if (!resultDemoEnabled()) fail('DEMO_POLICY_DISABLED', 'Password confirmation is available only in the configured demonstration.');
    if (!['ReleaseOfficialCourseResults', 'ApproveOfficialResultAmendment'].includes(input.action) || input.declaration !== PUBLICATION_DECLARATION)
      fail('INVALID_RESULT_COMMAND', 'Review the exact result decision before confirming.', 400);
    const amendment = input.action === 'ApproveOfficialResultAmendment' ? await this.prisma.resultAmendment.findUnique({ where: { id: input.targetId } }) : null;
    if (input.action === 'ApproveOfficialResultAmendment' && !amendment) fail('NOT_FOUND', 'Result decision not found.', 404);
    const pkg = await this.prisma.resultPackage.findUnique({ where: { id: amendment?.packageId ?? input.targetId } });
    if (!pkg) fail('NOT_FOUND', 'Result decision not found.', 404);
    await resultAuthority(this.prisma, actor, pkg!.periodCode, 'release-results');
    if ((amendment?.version ?? pkg!.version) !== input.version || pkg!.status !== 'APPROVED_FOR_RELEASE') fail('VERSION_CONFLICT', 'Reload the approved decision before confirming.', 409);
    if (pkg!.preparedByAccountId === actor.accountId || amendment?.requestedByAccountId === actor.accountId) fail('SOD_VIOLATION', 'An independent result officer must make this decision.');
    const credential = await this.prisma.credential.findFirst({ where: { accountId: actor.accountId, kind: 'PASSWORD', status: 'ACTIVE' } });
    const account = await this.prisma.account.findUnique({ where: { id: actor.accountId } });
    if (!credential || !account || account.status !== 'ACTIVE' || (account.lockedUntil && account.lockedUntil > new Date())) fail('CONFIRMATION_FAILED', 'Password confirmation failed.');
    const valid = await verify(credential!.secretHash, input.password).catch(() => false);
    if (!valid) {
      await this.prisma.$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR UPDATE`;
        const updated = await db.account.update({ where: { id: actor.accountId }, data: { failedSignInCount: { increment: 1 } } });
        if (updated.failedSignInCount >= SECURITY_V1.lockout.failuresBeforeLock) await db.account.update({ where: { id: actor.accountId }, data: { lockedUntil: new Date(Date.now() + SECURITY_V1.lockout.lockMinutes * 60000) } });
        await db.auditEvent.create({ data: { actorAccountId: actor.accountId, activeRole: actor.activeRole, scope: actor.scope, action: 'ResultPasswordConfirmation', outcome: 'DENY', targetRef: input.targetId, correlationId: randomUUID(), purpose: 'Synthetic result decision confirmation' } });
      });
      fail('CONFIRMATION_FAILED', 'Password confirmation failed.');
    }
    const proof = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 120000);
    await this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR UPDATE`;
      await resultAuthority(db, actor, pkg!.periodCode, 'release-results');
      const current = await db.credential.findUnique({ where: { id: credential!.id } });
      const currentAccount = await db.account.findUnique({ where: { id: actor.accountId } });
      if (!current || current.status !== 'ACTIVE' || current.secretHash !== credential!.secretHash || !currentAccount || (currentAccount.lockedUntil && currentAccount.lockedUntil > new Date())) fail('CONFIRMATION_FAILED', 'Password confirmation failed.');
      await db.resultReleaseProof.create({ data: { tokenHash: hash(proof), accountId: actor.accountId, assignmentId: actor.assignmentId!, sessionHash: hash(actor.sessionToken), action: input.action, commandDigest: resultCommandDigest(input.targetId, input.version, input.declaration), expiresAt } });
      await db.auditEvent.create({ data: { actorAccountId: actor.accountId, activeRole: actor.activeRole, scope: actor.scope, action: 'ResultPasswordConfirmation', outcome: 'ALLOW', targetRef: input.targetId, correlationId: randomUUID(), purpose: 'Synthetic result decision confirmation; password only, not MFA' } });
    });
    return { proof, expiresAt: expiresAt.toISOString(), assurance: 'DEMONSTRATION_PASSWORD_CONFIRMATION' };
  }
  async consume(db: Tx, context: Parameters<ResultStepUpVerifier['consume']>[1]) {
    if (!resultDemoEnabled() || !context.actor.assignmentId || !context.proof || !/^[A-Za-z0-9_-]{43}$/.test(context.proof)) return false;
    const result = await db.resultReleaseProof.updateMany({ where: { tokenHash: hash(context.proof), accountId: context.actor.accountId, assignmentId: context.actor.assignmentId, sessionHash: context.sessionHash, action: context.action, commandDigest: context.commandDigest, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    return result.count === 1;
  }
}

@Injectable()
export class ResultDemoPolicyService implements PublicationPolicyProvider {
  constructor(private readonly prisma: PrismaService) {}
  async resolve(db: Tx, offeringRef: string, periodCode: string) {
    if (!resultDemoEnabled()) return null;
    const policy = await db.resultDemoReleasePolicy.findFirst({ where: { offeringRef, periodCode, approvedAt: { not: null } }, orderBy: [{ approvedAt: 'desc' }, { id: 'desc' }] });
    if (!policy) return null;
    const [course, period] = await Promise.all([db.course.findUnique({ where: { id: policy.courseId } }), db.academicPeriod.findUnique({ where: { code: periodCode } })]);
    if (!course || course.code !== offeringRef || !period || period.status !== 'OPEN') return null;
    return { version: policy.version, courseId: policy.courseId, releaseAt: policy.releaseAt.toISOString(), showMarks: policy.showMarks, reviewInstructions: policy.reviewInstructions, restrictionsSatisfied: true };
  }
  async list(actor: Actor, periodCode: string) {
    await resultAuthority(this.prisma, actor, periodCode, ['validate-results', 'release-results']);
    return this.prisma.resultDemoReleasePolicy.findMany({ where: { periodCode }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  async prepare(actor: Actor, input: { idempotencyKey: string; offeringRef: string; periodCode: string; releaseAt: string; showMarks: boolean; reviewInstructions: string }) {
    return this.prisma.$transaction(async (db) => {
      await resultAuthority(db, actor, input.periodCode, 'validate-results');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.accountId + ':result-policy:' + input.idempotencyKey}, 0))`;
      const requestDigest = hash(JSON.stringify({ offeringRef: input.offeringRef, periodCode: input.periodCode, releaseAt: input.releaseAt, showMarks: input.showMarks, reviewInstructions: input.reviewInstructions }));
      const previous = await db.resultDemoReleasePolicy.findUnique({ where: { preparedByAccountId_idempotencyKey: { preparedByAccountId: actor.accountId, idempotencyKey: input.idempotencyKey } } });
      if (previous) {
        if (previous.requestDigest !== requestDigest || previous.preparedAssignmentId !== actor.assignmentId) fail('IDEMPOTENCY_CONFLICT', 'This request reference belongs to a different policy draft or appointment.', 409);
        return previous;
      }
      const [course, period] = await Promise.all([db.course.findUnique({ where: { code: input.offeringRef } }), db.academicPeriod.findUnique({ where: { code: input.periodCode } })]);
      if (!course || !period || period.status !== 'OPEN') fail('POLICY_SCOPE', 'Select an existing course and open academic period.', 409);
      const policy = await db.resultDemoReleasePolicy.create({ data: { ...input, requestDigest, courseId: course!.id, version: `DEMO-RESULT-2026.2/${randomUUID()}`, releaseAt: new Date(input.releaseAt), preparedByAccountId: actor.accountId, preparedAssignmentId: actor.assignmentId! } });
      await db.auditEvent.create({ data: { actorAccountId: actor.accountId, activeRole: actor.activeRole, scope: actor.scope, action: 'ResultDemoPolicyPrepared', outcome: 'ALLOW', targetRef: policy.id, correlationId: randomUUID(), purpose: 'Synthetic result release policy configuration' } });
      return policy;
    });
  }
  async approve(actor: Actor, id: string) {
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM "ResultDemoReleasePolicy" WHERE id = ${id} FOR UPDATE`;
      const policy = await db.resultDemoReleasePolicy.findUnique({ where: { id } });
      if (!policy) fail('NOT_FOUND', 'Result release policy not found.', 404);
      await resultAuthority(db, actor, policy!.periodCode, 'release-results');
      await db.$queryRaw`SELECT r.id FROM "RoleAssignment" r JOIN "Account" a ON a.id = r."accountId" WHERE r.id = ${policy!.preparedAssignmentId} FOR SHARE OF r,a`;
      const now = new Date();
      const originalAuthor = await db.roleAssignment.findFirst({ where: {
        id: policy!.preparedAssignmentId, accountId: policy!.preparedByAccountId,
        role: 'EXAMINATIONS_OFFICER', scopeType: 'PERIOD', scopeRef: policy!.periodCode,
        capabilities: { has: 'validate-results' }, revokedAt: null, startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }], account: { status: 'ACTIVE' },
      } });
      if (!originalAuthor) fail('POLICY_AUTHOR_AUTHORITY', 'The original policy author no longer holds the required appointment. Prepare a new policy.');
      const [author, reviewer, course, period] = await Promise.all([
        db.account.findUnique({ where: { id: policy!.preparedByAccountId } }),
        db.account.findUnique({ where: { id: actor.accountId } }),
        db.course.findUnique({ where: { id: policy!.courseId } }),
        db.academicPeriod.findUnique({ where: { code: policy!.periodCode } }),
      ]);
      if (!author || !reviewer || author.personId === reviewer.personId) fail('SOD_VIOLATION', 'A different examinations officer must approve this policy.');
      if (!course || course.code !== policy!.offeringRef || !period || period.status !== 'OPEN') fail('POLICY_SCOPE', 'The course or academic period changed. Prepare a new valid policy.', 409);
      if (policy!.approvedAt) return policy;
      const approved = await db.resultDemoReleasePolicy.update({ where: { id }, data: { approvedByAccountId: actor.accountId, approvedAssignmentId: actor.assignmentId!, approvedAt: new Date() } });
      await db.auditEvent.create({ data: { actorAccountId: actor.accountId, activeRole: actor.activeRole, scope: actor.scope, action: 'ResultDemoPolicyApproved', outcome: 'ALLOW', targetRef: id, correlationId: randomUUID(), purpose: 'Synthetic result release policy; not institutional approval' } });
      return approved;
    });
  }
}
