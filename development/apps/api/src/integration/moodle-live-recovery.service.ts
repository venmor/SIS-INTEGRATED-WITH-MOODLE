import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  requireActiveTransactionSession,
  type SessionAuthority,
} from '../identity-access/transaction-session.js';
import { MoodleLiveDeliveryService } from './moodle-live-delivery.service.js';
import { IntegrationService } from './integration.service.js';
import { selectBackend } from './moodle-live-config.js';

@Injectable()
export class MoodleLiveRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: MoodleLiveDeliveryService,
    private readonly integration: IntegrationService,
  ) {}
  async list(actor: SessionAuthority) {
    return this.prisma.$transaction(async tx => {
      await requireActiveTransactionSession(tx, actor);
      const assignment = await tx.roleAssignment.findUniqueOrThrow({ where: { id: actor.assignmentId! } });
      if (actor.activeRole !== 'INTEGRATION_SUPPORT' || !assignment.capabilities.includes('replay-event'))
        throw new ForbiddenException('LIVE_RECOVERY_AUTHORITY_REQUIRED');
      const selected = selectBackend();
      if (selected.kind !== 'live-test') throw new ConflictException('LIVE_CONNECTION_REQUIRED');
      const run = await tx.moodleLiveTestRun.findFirst({ where: { runId: selected.descriptor.runId, scopeType: assignment.scopeType, scopeRef: assignment.scopeRef } });
      if (!run) throw new NotFoundException('LIVE_RUN_NOT_FOUND');
      const claims = await tx.moodleLiveDeliveryClaim.findMany({ where: { runId: run.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 100 });
      const rows = await tx.courseRegistration.findMany({ where: { id: { in: claims.map(c => c.courseRegistrationId) } }, include: { course: true, registration: true } });
      const attempts = await tx.programmeAttempt.findMany({ where: { id: { in: rows.map(r => r.registration.attemptId) } }, include: { student: true } });
      return { state: run.state, items: claims.map(c => {
        const row = rows.find(r => r.id === c.courseRegistrationId);
        return { id: c.id, courseCode: row?.course.code ?? 'Unavailable course', studentNumber: attempts.find(a => a.id === row?.registration.attemptId)?.student.studentNumber ?? 'Unavailable student', state: c.state, attempt: c.attempt, lastCode: c.lastCode, updatedAt: c.updatedAt.toISOString(), canRetry: ['MANUAL_REVIEW','RETRY'].includes(c.state) || c.state === 'DELIVERING' && c.leaseUntil <= new Date() };
      }) };
    });
  }
  private async authorize(
    tx: Prisma.TransactionClient,
    actor: SessionAuthority,
    id: string,
  ) {
    await requireActiveTransactionSession(tx, actor);
    const a = await tx.roleAssignment.findUnique({
      where: { id: actor.assignmentId! },
    });
    if (
      !a ||
      actor.activeRole !== 'INTEGRATION_SUPPORT' ||
      !a.capabilities.includes('replay-event')
    )
      throw new ForbiddenException('LIVE_RECOVERY_AUTHORITY_REQUIRED');
    const existing = await tx.moodleLiveDeliveryClaim.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('LIVE_DELIVERY_NOT_FOUND');
    const run = await tx.moodleLiveTestRun.findUniqueOrThrow({
      where: { id: existing.runId },
    });
    if (a.scopeType !== run.scopeType || a.scopeRef !== run.scopeRef)
      throw new NotFoundException('LIVE_DELIVERY_NOT_FOUND');
    try {
      return await this.delivery.recoverySnapshot(tx, id);
    } catch {
      throw new ConflictException('CURRENT_DELIVERY_SOURCE_REQUIRED');
    }
  }
  async retry(
    actor: SessionAuthority,
    id: string,
    input: { idempotencyKey: string; reason: string },
  ) {
    try {
      return await this.integration.command(
        actor,
        input.idempotencyKey,
        'RequestLiveMoodleDeliveryRecovery',
        { id, reason: input.reason.trim() },
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "MoodleLiveDeliveryClaim" WHERE id=${id} FOR UPDATE`;
          const current = await this.authorize(tx, actor, id),
            prior = current.claim;
          if (
            !['MANUAL_REVIEW', 'RETRY'].includes(prior.state) &&
            !(prior.state === 'DELIVERING' && prior.leaseUntil <= new Date())
          )
            throw new ConflictException('DELIVERY_RECOVERY_NOT_REQUIRED');
          await tx.auditEvent.create({
            data: {
              actorAccountId: actor.accountId,
              activeRole: actor.activeRole,
              scope: actor.scope,
              action: 'MoodleLiveRecoveryRequested',
              targetRef: id,
              outcome: 'QUEUED',
              reason: input.reason.trim(),
              policyVersion: 'DEMO-MOODLE-REGISTRATION-2026.1',
              correlationId: randomUUID(),
              idempotencyRef: input.idempotencyKey,
              priorState: {
                state: prior.state,
                attempt: prior.attempt,
                sourceChecksum: prior.sourceChecksum,
                mappingId: prior.mappingId,
                mappingVersion: prior.mappingVersion,
                lastCode: prior.lastCode,
                evidenceChecksum: prior.evidenceChecksum,
                updatedAt: prior.updatedAt.toISOString(),
              },
              newState: {
                state: 'RETRY',
                sourceChecksum: current.sourceChecksum,
                mappingId: current.mappingId,
                mappingVersion: current.mappingVersion,
              },
            },
          });
          await tx.moodleLiveDeliveryClaim.update({
            where: { id },
            data: {
              state: 'RETRY',
              nextRunAt: new Date(),
              leaseToken: randomUUID(),
              leaseUntil: new Date(),
              sourceChecksum: current.sourceChecksum,
              mappingId: current.mappingId,
              mappingVersion: current.mappingVersion,
            },
          });
          return {
            body: {
              id,
              outcome: 'RECOVERY_QUEUED',
              detail:
                'The worker will verify Moodle identity and actual enrolment before applying or confirming this request.',
            },
          };
        },
        async (tx) => {
          await this.authorize(tx, actor, id);
        },
      );
    } catch (error) {
      await this.prisma.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          activeRole: actor.activeRole,
          action: 'MoodleLiveRecoveryRefused',
          targetRef: id,
          outcome: 'DENIED',
          reason: 'AUTHORITY_OR_SOURCE_REFUSED',
          policyVersion: 'DEMO-MOODLE-REGISTRATION-2026.1',
          correlationId: randomUUID(),
        },
      });
      throw error;
    }
  }
}
