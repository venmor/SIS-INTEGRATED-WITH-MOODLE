import { HttpException, Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { MoodleLaunchTicket } from '@prisma/client';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { auditAuth } from '../identity-access/audit.js';
import { MoodleEntitlementService } from './moodle-entitlement.service.js';
import type { Entitlement } from './moodle-entitlement.service.js';

interface LaunchAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

/** Launch credentials are single-use and short-lived; access is entitlement-based. */
const TICKET_TTL_MS = 2 * 60 * 1000;

/**
 * Lifetime of the Moodle-side SSO assertion. It is deliberately shorter than
 * the ticket: the assertion is verified by Moodle without asking SIS again, so
 * it trades a small replay window for a credential that never has to survive a
 * network round trip. Moodle additionally refuses it unless the student really
 * is enrolled in the named course, so a revoked enrolment fails closed even
 * inside the window.
 */
const SSO_ASSERTION_TTL_MS = 60 * 1000;

/**
 * Moodle SSO launch service (design 2026-10-22).
 *
 * Access is decided by SIS entitlement (delivered provisioning item, live
 * registration, active student, unexpired policy, no revocation) on every
 * click — not by a long-lived token. The launch ticket itself is a
 * single-use, short-lived credential bound to one student + course and is
 * consumed on first use.
 *
 * The Moodle-side SSO bridge is configuration-dependent: when
 * MOODLE_SSO_BRIDGE_URL is set the ticket is appended as `sso` for the
 * approved bridge; otherwise the launch reports DEEP_LINK_ONLY and returns
 * the mapped Moodle course URL without pretending to authenticate. No
 * bridge URL is invented here.
 */
@Injectable()
export class MoodleLaunchService {
  private readonly logger = new Logger(MoodleLaunchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlement: MoodleEntitlementService,
  ) {}

  private signingKey(): string {
    const key = process.env.MOODLE_SSO_SIGNING_KEY;
    if (!key || key.length < 32) {
      throw new HttpException(
        {
          code: 'MOODLE_SSO_NOT_CONFIGURED',
          message: 'Moodle launch signing is not configured.',
          supportReference: randomUUID(),
        },
        503,
      );
    }
    return key;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.signingKey()).update(payload).digest('hex');
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Resolve the student behind a signed-in account. */
  private async studentForAccount(accountId: string): Promise<string | null> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { personId: true },
    });
    if (!account) return null;
    const student = await this.prisma.student.findUnique({
      where: { personId: account.personId },
      select: { id: true },
    });
    return student?.id ?? null;
  }

  private moodleBaseUrl(): string | null {
    const url = process.env.MOODLE_BASE_URL;
    return url && /^https?:\/\//.test(url) ? url.replace(/\/$/, '') : null;
  }

  private courseUrl(courseRef: string | null): string | null {
    const base = this.moodleBaseUrl();
    if (!base || !courseRef) return null;
    return `${base}/course/view.php?id=${encodeURIComponent(courseRef)}`;
  }

  /**
   * Issue a launch for one student + registered course.
   * Students may only launch their own courses; staff need delegated
   * `moodle:launch` or `moodle:provision` authority.
   */
  async createLaunchToken(
    auth: LaunchAuthority,
    input: { studentId: string | null; courseId: string | null; shellRef: string | null },
  ) {
    if (!input.courseId) {
      throw new HttpException(
        { code: 'COURSE_REQUIRED', message: 'A registered course is required.', supportReference: randomUUID() },
        400,
      );
    }

    const ownStudentId = await this.studentForAccount(auth.accountId);
    const isStudent = auth.activeRole === 'STU' || Boolean(ownStudentId);

    let studentId = input.studentId ?? ownStudentId;
    if (isStudent) {
      if (!ownStudentId) {
        throw new HttpException(
          { code: 'STUDENT_RECORD_MISSING', message: 'No student record for this account.', supportReference: randomUUID() },
          403,
        );
      }
      if (input.studentId && input.studentId !== ownStudentId) {
        await this.deny(auth, input.studentId, 'other-student');
        throw new HttpException(
          { code: 'LAUNCH_DENIED', message: 'You can only open your own courses.', supportReference: randomUUID() },
          403,
        );
      }
      studentId = ownStudentId;
    } else {
      await this.requireStaffAuthority(auth);
      if (!studentId) {
        throw new HttpException(
          { code: 'STUDENT_REQUIRED', message: 'A student is required for staff launches.', supportReference: randomUUID() },
          400,
        );
      }
    }

    const resolved = await this.entitlement.resolve(this.prisma, {
      studentId: studentId!,
      courseRegistrationId: input.courseId,
    });
    if (!resolved.entitled) {
      await this.deny(auth, studentId!, resolved.reason);
      throw new HttpException(
        {
          code: 'NOT_ENTITLED',
          reason: resolved.reason,
          message: 'Moodle access is not available for this course.',
          supportReference: randomUUID(),
        },
        403,
      );
    }

    const token = randomBytes(32).toString('base64url');
    const nonce = randomUUID();
    const signature = this.sign(`${token}.${nonce}`);
    const signed = `${token}.${nonce}.${signature}`;
    const expiresAt = new Date(Date.now() + TICKET_TTL_MS);

    await this.prisma.moodleLaunchTicket.create({
      data: {
        tokenHash: this.hash(signed),
        studentId: studentId!,
        courseRegistrationId: input.courseId,
        provisionItemId: resolved.itemId ?? null,
        issuedToAccountId: auth.accountId,
        expiresAt,
      },
    });

    const bridge = process.env.MOODLE_SSO_BRIDGE_URL;
    const courseUrl = this.courseUrl(resolved.moodleCourseRef ?? input.shellRef);

    // With a bridge configured, the launch becomes a real single sign-on: the
    // student is signed into Moodle, not merely sent to a course page. Without
    // the numeric Moodle identities behind that entitlement, or without a
    // bridge, the launch honestly reports a deep link instead of pretending.
    let mode: 'SSO' | 'DEEP_LINK_ONLY' = 'DEEP_LINK_ONLY';
    let launchUrl = courseUrl;
    if (bridge) {
      const identities = await this.moodleIdentities(studentId!, resolved.moodleCourseRef ?? null);
      const assertion = identities
        ? this.signAssertion({
            v: 1,
            uid: identities.moodleUserId,
            cid: identities.moodleCourseId,
            sub: studentId!,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor((Date.now() + SSO_ASSERTION_TTL_MS) / 1000),
            nonce: randomUUID(),
          })
        : null;
      if (assertion) {
        launchUrl = `${bridge}${bridge.includes('?') ? '&' : '?'}sso=${encodeURIComponent(assertion)}`;
        mode = 'SSO';
      }
    }

    await auditAuth(this.prisma, {
      action: 'CMD-Moodle-LaunchIssue',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scopeType && auth.scopeRef ? `${auth.scopeType}:${auth.scopeRef}` : null,
      targetRef: studentId!,
      reason: 'launch-issued',
      purpose: 'moodle-launch',
      metadata: { courseRegistrationId: input.courseId, mode },
    });

    return {
      ok: true as const,
      mode,
      launchUrl,
      expiresAt: expiresAt.toISOString(),
      entitlement: {
        validityPolicy: resolved.validityPolicy ?? null,
        validUntil: resolved.validUntil ?? null,
      },
    };
  }

  /**
   * Resolve the numeric Moodle identities an entitled launch maps to: the
   * course shell the student may enter and the Moodle account that student has.
   * Returns null when either is unknown, so a launch degrades to a deep link
   * rather than issuing a credential Moodle could not honour.
   */
  private async moodleIdentities(
    studentId: string,
    courseRef: string | null,
  ): Promise<{ moodleCourseId: number; moodleUserId: number } | null> {
    if (courseRef === null || !/^\d+$/.test(courseRef)) return null;
    const userMapping = await this.prisma.moodleMapping.findFirst({
      where: { kind: 'USER', sisType: 'STUDENT', sisId: studentId, status: 'ACTIVE' },
      select: { moodleId: true },
    });
    if (!userMapping || !/^\d+$/.test(userMapping.moodleId)) return null;
    return { moodleCourseId: Number(courseRef), moodleUserId: Number(userMapping.moodleId) };
  }

  /**
   * Sign a Moodle SSO assertion: `base64url(payload).base64url(hmac)`.
   *
   * The key is shared with the bridge installed inside the Moodle site, which
   * verifies it with hash_equals, checks the expiry, refuses a repeated nonce
   * and confirms the student is genuinely enrolled in that course.
   */
  private signAssertion(payload: Record<string, unknown>): string | null {
    const key = process.env.MOODLE_SSO_SIGNING_KEY;
    if (!key || key.length < 32) return null;
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mac = createHmac('sha256', key).update(body).digest('base64url');
    return `${body}.${mac}`;
  }

  /**
   * The signed-in student's own Moodle access, per registered course.
   * Entitlement is resolved live so the dashboard shows the same decision
   * the launch endpoint will make. No launch URLs are issued here.
   */
  async myAccess(auth: LaunchAuthority) {
    const studentId = await this.studentForAccount(auth.accountId);
    if (!studentId) {
      throw new HttpException(
        {
          code: 'STUDENT_RECORD_MISSING',
          message: 'No student record is linked to this account.',
          supportReference: randomUUID(),
        },
        403,
      );
    }

    const attempts = await this.prisma.programmeAttempt.findMany({
      where: { studentId, status: { in: ['ADMITTED', 'ACTIVE'] } },
      select: { id: true },
    });
    const attemptIds = attempts.map((a) => a.id);
    if (attemptIds.length === 0) return { items: [] };

    const registrations = await this.prisma.institutionalRegistration.findMany({
      where: { attemptId: { in: attemptIds }, status: 'REGISTERED' },
      select: {
        periodId: true,
        roster: {
          where: { status: 'ENROLLED' },
          select: {
            id: true,
            course: { select: { code: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const periodIds = [...new Set(registrations.map((r) => r.periodId))];
    const periods = periodIds.length
      ? await this.prisma.academicPeriod.findMany({
          where: { id: { in: periodIds } },
          select: { id: true, code: true },
        })
      : [];
    const periodCode = new Map(periods.map((p) => [p.id, p.code]));

    const seen = new Set<string>();
    const items: Array<Record<string, unknown>> = [];
    for (const registration of registrations) {
      for (const course of registration.roster) {
        if (seen.has(course.id)) continue;
        seen.add(course.id);
        const entitlement = await this.entitlement.resolve(this.prisma, {
          studentId,
          courseRegistrationId: course.id,
        });
        items.push({
          courseRegistrationId: course.id,
          courseCode: course.course.code,
          courseTitle: course.course.title,
          periodCode: periodCode.get(registration.periodId) ?? null,
          entitled: entitlement.entitled,
          reason: entitlement.reason,
          validityPolicy: entitlement.validityPolicy ?? null,
          validUntil: entitlement.validUntil ?? null,
        });
      }
    }

    return { items };
  }

  /**
   * Redeem a ticket once — signature, store, expiry, single use and
   * entitlement. Both consumers go through here so a revocation between issue
   * and use always fails closed and a ticket can never be spent twice.
   */
  private async redeem(token: string): Promise<
    { ok: true; ticket: MoodleLaunchTicket; resolved: Entitlement } | { ok: false; reason: string }
  > {
    const parts = token.split('.');
    if (parts.length !== 3) return { ok: false as const, reason: 'MALFORMED' };
    const [raw, nonce, signature] = parts;
    const expected = this.sign(`${raw}.${nonce}`);
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false as const, reason: 'SIGNATURE' };
    }

    const ticket = await this.prisma.moodleLaunchTicket.findUnique({
      where: { tokenHash: this.hash(token) },
    });
    if (!ticket) return { ok: false as const, reason: 'UNKNOWN' };
    if (ticket.usedAt) return { ok: false as const, reason: 'USED' };
    if (ticket.expiresAt < new Date()) return { ok: false as const, reason: 'EXPIRED' };

    const resolved = await this.entitlement.resolve(this.prisma, {
      studentId: ticket.studentId,
      courseRegistrationId: ticket.courseRegistrationId,
    });
    if (!resolved.entitled) return { ok: false as const, reason: resolved.reason };

    await this.prisma.moodleLaunchTicket.update({
      where: { id: ticket.id },
      data: { usedAt: new Date() },
    });

    return { ok: true as const, ticket, resolved };
  }

  /**
   * Consume a launch ticket exactly once and return the destination URL.
   * Entitlement is re-checked at consumption so a revocation between issue
   * and use still fails closed.
   */
  async consumeLaunchToken(token: string) {
    const result = await this.redeem(token);
    if (!result.ok) return result;
    return {
      ok: true as const,
      url: this.courseUrl(result.resolved.moodleCourseRef ?? null),
    };
  }

  /**
   * Moodle-side bridge resolution (design 2026-10-22).
   *
   * A browser cannot log into Moodle with an SIS ticket by itself: the
   * trusted bridge inside the Moodle site redeems the same single-use ticket
   * over the server-to-server interface and opens a real Moodle session for
   * the student the ticket was issued to. This returns exactly the two Moodle
   * identities that needs — the numeric course id of the entitled shell and
   * the numeric user id of the entitled student — and nothing else.
   *
   * Fails closed when no delivered course shell is mapped yet, or the student
   * has no active Moodle user mapping.
   */
  async resolveBridgeTicket(token: string) {
    const result = await this.redeem(token);
    if (!result.ok) return result;

    const identities = await this.moodleIdentities(
      result.ticket.studentId,
      result.resolved.moodleCourseRef ?? null,
    );
    if (!identities) {
      const missing =
        result.resolved.moodleCourseRef && /^\d+$/.test(String(result.resolved.moodleCourseRef))
          ? 'NO_MOODLE_USER'
          : 'NO_MOODLE_COURSE';
      return { ok: false as const, reason: missing };
    }

    return { ok: true as const, ...identities };
  }

  private async requireStaffAuthority(auth: LaunchAuthority) {
    const role = auth.activeRole ?? '';
    if (['MOODLE_ADMIN', 'INTEGRATION_SUPPORT', 'SYSADMIN', 'HOD', 'DEAN'].includes(role)) return;
    await this.deny(auth, null, 'staff-authority');
    throw new HttpException(
      { code: 'LAUNCH_DENIED', message: 'No authority to launch on behalf of a student.', supportReference: randomUUID() },
      403,
    );
  }

  private async deny(auth: LaunchAuthority, studentRef: string | null, reason: string) {
    await auditAuth(this.prisma, {
      action: 'CMD-Moodle-LaunchDeny',
      outcome: 'DENY',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scopeType && auth.scopeRef ? `${auth.scopeType}:${auth.scopeRef}` : null,
      targetRef: studentRef ?? undefined,
      reason,
      purpose: 'moodle-launch',
    });
  }
}
