import { Body, Controller, ForbiddenException, Header, Injectable, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../identity-access/prisma.service.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import { requireActiveTransactionSession, type SessionAuthority } from '../identity-access/transaction-session.js';
import { MoodleLiveDeliveryService } from './moodle-live-delivery.service.js';
import { IntegrationService } from './integration.service.js';
import { selectBackend } from './moodle-live-config.js';
import { initialDemoCredential } from './moodle-demo-credential-config.js';
class DemoPasswordDto { @IsUUID() registrationId!: string; }
interface R extends Request { auth: SessionAuthority; }
@Injectable()
export class MoodleDemoPasswordService {
  constructor(private readonly prisma: PrismaService, private readonly integration: IntegrationService, private readonly delivery: MoodleLiveDeliveryService) {}
  async reveal(actor: SessionAuthority, registrationId: string) {
    if (actor.activeRole !== 'STUDENT') throw new ForbiddenException('Use your student workspace.');
    const selected = selectBackend();
    if (selected.kind !== 'live-test') throw new NotFoundException('Initial demo password is unavailable.');
    // The normal access projection already derives the Moodle username from
    // verified own-registration bindings. No caller supplies a Moodle identity.
    const student = await this.prisma.student.findFirst({ where: { status: 'ACTIVE', person: { status: 'ACTIVE', accounts: { some: { id: actor.accountId, status: 'ACTIVE' } } } } });
    if (!student) throw new NotFoundException('Initial demo password is unavailable.');
    const access = await this.integration.liveRegistrationAccess(registrationId, student.id);
    const credential = initialDemoCredential(access?.username ?? null, selected.descriptor.host);
    if (!access?.confirmedCount || !credential) throw new NotFoundException('Initial demo password is unavailable.');
    return this.prisma.$transaction(async tx => {
      await requireActiveTransactionSession(tx, actor);
      const registration = await tx.institutionalRegistration.findFirst({ where: { id: registrationId, status: 'REGISTERED' } });
      const own = registration && await tx.programmeAttempt.findFirst({ where: { id: registration.attemptId, studentId: student.id, student: { status: 'ACTIVE', person: { status: 'ACTIVE', accounts: { some: { id: actor.accountId, status: 'ACTIVE' } } } } } });
      const appointment = await tx.roleAssignment.findFirst({ where: { id: actor.assignmentId!, capabilities: { has: 'study' } } });
      if (!own || !appointment) throw new NotFoundException('Initial demo password is unavailable.');
      const rows = await tx.courseRegistration.findMany({ where: { registrationId, status: 'ENROLLED' }, select: { id: true }, take: 200 });
      let verified = false;
      for (const row of rows) {
        const identity = await this.delivery.confirmedStudentIdentity(tx, row.id);
        if (identity?.moodleUserId === credential.moodleUserId) { verified = true; break; }
      }
      if (!verified) throw new NotFoundException('Initial demo password is unavailable.');
      // Only metadata enters immutable audit. The initial password is never
      // stored in a command receipt, ordinary status response or audit body.
      await tx.auditEvent.create({ data: { actorAccountId: actor.accountId, activeRole: actor.activeRole, action: 'MoodleInitialDemoPasswordViewed', targetRef: registrationId, outcome: 'ALLOW', policyVersion: 'DEMO-MOODLE-REGISTRATION-2026.1', correlationId: randomUUID() } });
      return { username: access.username, initialPassword: credential.password };
    }, { timeout: 20000 });
  }
}
@Controller('integration/me/moodle-demo-password')
@UseGuards(SessionGuard, CsrfGuard, ApplicationRateGuard)
export class MoodleDemoPasswordController {
  constructor(private readonly passwords: MoodleDemoPasswordService) {}
  @Post() @Header('Cache-Control', 'no-store, private') @Header('Pragma','no-cache') @Header('Referrer-Policy','no-referrer')
  reveal(@Req() r: R, @Body() input: DemoPasswordDto) { return this.passwords.reveal(r.auth, input.registrationId); }
}
