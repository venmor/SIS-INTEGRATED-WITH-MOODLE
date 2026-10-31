import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { auditAuth } from '../identity-access/audit.js';
import { IncidentInterceptor } from '../identity-access/incident.interceptor.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { demoSignInFreedomEnabled, RateLimiter } from '../identity-access/rate-limit.js';
import { DemoUniversitySetupService } from './demo-university.service.js';

@Controller('institution-setup/demo-university')
@UseGuards(SessionGuard)
@UseInterceptors(IncidentInterceptor)
export class DemoUniversitySetupController {
  private readonly limiter = new RateLimiter();
  constructor(
    private readonly setup: DemoUniversitySetupService,
    private readonly prisma: PrismaService,
  ) {}
  private async execute<T>(
    actor: ActiveAuthority,
    action: string,
    command: () => Promise<T>,
  ) {
    try {
      const result = await command();
      if (action === 'DemoInstitutionSetupViewed')
        await auditAuth(this.prisma, {
          action,
          outcome: 'ALLOW',
          actorAccountId: actor.accountId,
          activeRole: actor.activeRole,
          scope: actor.scope,
          purpose: 'fictional-university-setup',
        });
      return result;
    } catch (error) {
      await auditAuth(this.prisma, {
        action,
        outcome: 'DENY',
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        reason: 'setup-command-refused',
        purpose: 'fictional-university-setup',
      });
      throw error;
    }
  }
  private async budget(
    actor: ActiveAuthority,
    res: Response,
    key: string,
    limit: { maxAttempts: number; windowMinutes: number },
  ) {
    // Activation shares the sign-in budget (5 per 15 minutes), which a
    // demonstration run exhausts while re-seeding the cloud database. Keep the
    // no-store header either way; only the budget is skipped.
    const check = demoSignInFreedomEnabled()
      ? { allowed: true as const, retryAfterSeconds: 0 }
      : this.limiter.check(
          `${key}:${actor.accountId}`,
          limit.maxAttempts,
          limit.windowMinutes,
        );
    res.setHeader('Cache-Control', 'no-store');
    if (!check.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'DemoInstitutionSetupRateLimited',
        outcome: 'DENY',
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        purpose: 'fictional-university-setup',
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(check.retryAfterSeconds));
      throw new HttpException(
        {
          message:
            'Too many attempts. Check your existing setup version and wait before trying again.',
          reference: correlationId,
        },
        429,
      );
    }
  }
  @Get()
  async report(
    @Req() req: { auth: ActiveAuthority },
    @Res({ passthrough: true }) res: Response,
    @Query('beforeVersion') cursor?: string,
  ) {
    await this.budget(req.auth, res, 'setup-read', RateLimiter.readLimit());
    return this.execute(req.auth, 'DemoInstitutionSetupViewed', () => {
      if (
        cursor !== undefined &&
        (typeof cursor !== 'string' || !/^[1-9]\d{0,8}$/.test(cursor))
      )
        throw new BadRequestException(
          'Use a valid saved-version history reference.',
        );
      return this.setup.report(
        req.auth,
        cursor === undefined ? undefined : Number(cursor),
      );
    });
  }
  @Post()
  @UseGuards(CsrfGuard)
  async save(
    @Req() req: { auth: ActiveAuthority },
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.budget(req.auth, res, 'setup-draft', RateLimiter.grantLimit());
    return this.execute(req.auth, 'DemoInstitutionSetupDraftSaved', () =>
      this.setup.save(req.auth, body),
    );
  }
  @Post(':id/activate')
  @UseGuards(CsrfGuard)
  async activate(
    @Req() req: { auth: ActiveAuthority },
    @Param('id') id: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.budget(
      req.auth,
      res,
      'setup-reconfirmation',
      RateLimiter.signInLimit(),
    );
    return this.execute(req.auth, 'DemoInstitutionSetupActivated', () =>
      this.setup.activate(req.auth, id, body),
    );
  }
}
