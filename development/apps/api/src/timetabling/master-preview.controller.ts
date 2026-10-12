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
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { RateLimiter } from '../identity-access/rate-limit.js';
import { timetableAppointment } from './timetable-authority.js';
import { TimetablePublicationService } from './publication.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { auditAuth } from '../identity-access/audit.js';
import { IncidentInterceptor } from '../identity-access/incident.interceptor.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { MasterPreviewService } from './master-preview.service.js';

interface RequestWithAuthority {
  auth: ActiveAuthority;
}

@Controller('timetabling/demo-master')
@UseGuards(SessionGuard)
@UseInterceptors(IncidentInterceptor)
export class MasterPreviewController {
  private readonly limiter = new RateLimiter();
  constructor(
    private readonly preview: MasterPreviewService,
    private readonly prisma: PrismaService,
    private readonly publications: TimetablePublicationService,
  ) {}
  private budget(
    actor: ActiveAuthority,
    res: Response,
    kind: 'read' | 'draft' | 'publish',
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const limit =
      kind === 'publish'
        ? RateLimiter.signInLimit()
        : kind === 'draft'
          ? RateLimiter.grantLimit()
          : RateLimiter.readLimit();
    const check = this.limiter.check(
      `timetable-${kind}:${actor.accountId}`,
      limit.maxAttempts,
      limit.windowMinutes,
    );
    if (!check.allowed) {
      res.setHeader('Retry-After', String(check.retryAfterSeconds));
      throw new HttpException(
        {
          message:
            'Too many attempts. Check the saved publication state and wait before trying again.',
        },
        429,
      );
    }
  }

  private async read<T>(actor: ActiveAuthority, operation: () => Promise<T>) {
    try {
      const result = await operation();
      await auditAuth(this.prisma, {
        action: 'DemoMasterTimetableViewed',
        outcome: 'ALLOW',
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        purpose: 'fictional-timetable-planning',
      });
      return result;
    } catch (error) {
      await auditAuth(this.prisma, {
        action: 'DemoMasterTimetableViewed',
        outcome: 'DENY',
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        purpose: 'fictional-timetable-planning',
        reason: 'appointment-or-draft-not-available',
      });
      throw error;
    }
  }

  @Get('permissions')
  async permissions(
    @Req() req: RequestWithAuthority,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'read');
    return this.read(req.auth, async () => {
      await timetableAppointment(this.prisma, req.auth, 'read');
      return {
        canRead: true,
        canCreate: req.auth.activeRole === 'TIMETABLE_COORDINATOR',
        canPublish: req.auth.activeRole === 'DOMAIN_ADMIN',
      };
    });
  }

  @Get('catalogue')
  catalogue(
    @Req() req: RequestWithAuthority,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'read');
    return this.read(req.auth, () => this.preview.catalogue(req.auth));
  }

  @Get()
  list(
    @Req() req: RequestWithAuthority,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'read');
    return this.read(req.auth, () => this.preview.list(req.auth));
  }

  @Get('draft-history')
  async draftHistory(
    @Req() req: RequestWithAuthority,
    @Query('periodId') periodId: string,
    @Query('beforeVersion') cursor: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'read');
    return this.read(req.auth, () => {
      if (
        typeof periodId !== 'string' ||
        (cursor !== undefined &&
          (typeof cursor !== 'string' || !/^[1-9]\d{0,8}$/.test(cursor)))
      )
        throw new BadRequestException(
          'Select a fictional period and valid saved-version reference.',
        );
      return this.preview.draftHistory(
        req.auth,
        periodId,
        cursor === undefined ? undefined : Number(cursor),
      );
    });
  }

  @Get(':id/course/:courseCode')
  course(
    @Req() req: RequestWithAuthority,
    @Param('id') id: string,
    @Param('courseCode') courseCode: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'read');
    return this.read(req.auth, () =>
      this.preview.course(req.auth, id, courseCode),
    );
  }

  @Post()
  @UseGuards(CsrfGuard)
  async create(
    @Req() req: RequestWithAuthority,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'draft');
    try {
      return await this.preview.create(req.auth, body);
    } catch (error) {
      await auditAuth(this.prisma, {
        action: 'DemoMasterTimetableDraftSaved',
        outcome: 'DENY',
        actorAccountId: req.auth.accountId,
        activeRole: req.auth.activeRole,
        scope: req.auth.scope,
        purpose: 'fictional-timetable-planning',
        reason: 'draft-validation-or-authority-denied',
      });
      throw error;
    }
  }
  @Get(':id/publication-review')
  async publicationReview(
    @Req() req: RequestWithAuthority,
    @Param('id') id: string,
    @Query('beforeVersion') cursor: string | undefined,
    @Query('clientRequestId') clientRequestId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'read');
    return this.read(req.auth, () => {
      if (
        cursor !== undefined &&
        (typeof cursor !== 'string' || !/^[1-9]\d{0,8}$/.test(cursor))
      )
        throw new BadRequestException(
          'Use a valid publication history reference.',
        );
      return this.publications.review(
        req.auth,
        id,
        cursor === undefined ? undefined : Number(cursor),
        clientRequestId,
      );
    });
  }
  @Post(':id/publish')
  @UseGuards(CsrfGuard)
  async publish(
    @Req() req: RequestWithAuthority,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.budget(req.auth, res, 'publish');
    try {
      return await this.publications.publish(req.auth, id, body);
    } catch (error) {
      await auditAuth(this.prisma, {
        action: 'DemoTimetablePublished',
        outcome: 'DENY',
        actorAccountId: req.auth.accountId,
        activeRole: req.auth.activeRole,
        scope: req.auth.scope,
        purpose: 'fictional-timetable-publication',
        reason: 'publication-validation-or-authority-denied',
      });
      throw error;
    }
  }
}
