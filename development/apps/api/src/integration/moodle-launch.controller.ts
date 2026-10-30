import { Controller, Get, Headers, Param, Res } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';
import { MoodleLaunchService } from './moodle-launch.service.js';

/**
 * Consumes a signed, single-use Moodle launch ticket.
 *
 * This route is intentionally unguarded: the signed ticket *is* the
 * credential, it is single-use, short-lived, and entitlement is re-checked
 * at consumption. It never reveals whether a ticket existed beyond the
 * failure reason.
 */
@Controller('moodle/launch')
export class MoodleLaunchConsumeController {
  constructor(private readonly launch: MoodleLaunchService) {}

  @Get('consume/:token')
  async consume(@Param('token') token: string, @Res() res: Response) {
    const result = await this.launch.consumeLaunchToken(token);
    if (!result.ok || !result.url) {
      return res.status(403).json({
        code: 'LAUNCH_REFUSED',
        reason: result.ok ? 'NO_DESTINATION' : result.reason,
        message: 'This Moodle launch link is no longer valid.',
      });
    }
    return res.redirect(302, result.url);
  }

  /**
   * Server-to-server redemption for the Moodle SSO bridge.
   *
   * The bridge runs inside the Moodle site and authenticates with the shared
   * secret in MOODLE_SSO_BRIDGE_SECRET. It receives only the numeric Moodle
   * identities behind an already-entitled, still-unspent ticket, so a leaked
   * bridge URL cannot be used to open a session for anyone.
   */
  @Get('bridge/:token')
  async bridge(
    @Param('token') token: string,
    @Headers('x-sis-bridge-secret') secret: string | undefined,
    @Res() res: Response,
  ) {
    const expected = process.env.MOODLE_SSO_BRIDGE_SECRET ?? '';
    if (expected.length < 32 || !this.secretMatches(secret ?? '', expected)) {
      return res.status(401).json({ code: 'BRIDGE_UNAUTHENTICATED' });
    }
    const result = await this.launch.resolveBridgeTicket(token);
    if (!result.ok) {
      return res.status(403).json({
        code: 'LAUNCH_REFUSED',
        reason: result.reason,
        message: 'This Moodle launch link is no longer valid.',
      });
    }
    return res.json({ ok: true, moodleCourseId: result.moodleCourseId, moodleUserId: result.moodleUserId });
  }

  private secretMatches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
