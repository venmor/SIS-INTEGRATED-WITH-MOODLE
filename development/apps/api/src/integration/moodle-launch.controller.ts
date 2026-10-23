import { Controller, Get, Param, Res } from '@nestjs/common';
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
}
