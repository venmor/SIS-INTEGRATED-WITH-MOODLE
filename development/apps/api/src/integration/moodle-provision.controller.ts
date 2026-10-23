import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { MoodleProvisionService } from './moodle-provision.service.js';
import { MoodleLaunchService } from './moodle-launch.service.js';
import { MoodleGradeSyncService } from './moodle-grade-sync.service.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

interface ProvisionBody {
  idempotencyKey?: string;
  studentIds?: string[];
  courseRegistrationIds?: string[];
  offeringId?: string | null;
  targetScopeType?: string | null;
  targetScopeRef?: string | null;
  validityPolicy?: string;
  validUntil?: string | null;
  reason?: string;
}

/**
 * Moodle access provisioning API (design 2026-10-22).
 *
 * Staff with delegated `moodle:provision` authority can create provisioning
 * requests to assign Moodle access to students for registered courses. All
 * endpoints are guarded by SessionGuard + CsrfGuard; the service enforces
 * capability, scope hierarchy and audit, and fails closed.
 */
@Controller('moodle')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class MoodleProvisionController {
  constructor(
    private readonly provision: MoodleProvisionService,
    private readonly launchService: MoodleLaunchService,
    private readonly gradeSync: MoodleGradeSyncService,
  ) {}

  @Post('provision')
  @UseGuards(CsrfGuard)
  create(@Req() r: AuthRequest, @Body() body: ProvisionBody) {
    return this.provision.createProvisionRequest(r.auth, {
      idempotencyKey: body.idempotencyKey,
      studentIds: body.studentIds ?? [],
      courseRegistrationIds: body.courseRegistrationIds ?? [],
      offeringId: body.offeringId ?? null,
      scopeType: body.targetScopeType ?? r.auth.scopeType ?? null,
      scopeRef: body.targetScopeRef ?? r.auth.scopeRef ?? null,
      targetScopeType: body.targetScopeType ?? null,
      targetScopeRef: body.targetScopeRef ?? null,
      validityPolicy: body.validityPolicy ?? 'WHILE_ENROLLED',
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      reason: body.reason,
    });
  }

  @Get('provision')
  list(
    @Req() r: AuthRequest,
    @Query('state') state?: string,
    @Query('studentId') studentId?: string,
    @Query('offeringId') offeringId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.provision.listProvisionRequests(r.auth, {
      state,
      studentId,
      offeringId,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Search students eligible for Moodle provisioning.
   * Scope-enforced: actors only see students inside their scope hierarchy.
   */
  @Get('provision/students/search')
  searchStudents(
    @Req() r: AuthRequest,
    @Query('q') q?: string,
    @Query('studentNumber') studentNumber?: string,
    @Query('programmeId') programmeId?: string,
    @Query('offeringId') offeringId?: string,
    @Query('periodCode') periodCode?: string,
    @Query('courseCode') courseCode?: string,
    @Query('registrationState') registrationState?: string,
    @Query('hasMoodleAccess') hasMoodleAccess?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.provision.searchStudents(r.auth, {
      q,
      studentNumber,
      programmeId,
      offeringId,
      periodCode,
      courseCode,
      registrationState,
      hasMoodleAccess:
        hasMoodleAccess === 'true'
          ? true
          : hasMoodleAccess === 'false'
            ? false
            : undefined,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * The signed-in student's own Moodle access per registered course, with the
   * live entitlement decision. Launch URLs are issued per click, not here.
   */
  @Get('my-access')
  myAccess(@Req() r: AuthRequest) {
    return this.launchService.myAccess(r.auth);
  }

  /**
   * Run the access expiry/drift sweep now for the caller's scope. The same
   * sweep runs on a schedule; this is an operations aid, not the only path.
   */
  @Post('provision/sweep')
  @UseGuards(CsrfGuard)
  sweep(@Req() r: AuthRequest) {
    return this.provision.sweepExpiredAccessForActor(r.auth);
  }

  /**
   * Grade passback status and a manual sync trigger. Automatic sync only
   * runs when MOODLE_GRADE_AUTO_SYNC=true; both entry points require the
   * `moodle:grade-sync` capability and stop at SIS staging.
   */
  @Get('grade-sync/status')
  async gradeSyncStatus(@Req() r: AuthRequest) {
    await this.provision.assertCapability(r.auth, 'moodle:grade-sync');
    return this.gradeSync.status();
  }

  @Post('grade-sync/run')
  @UseGuards(CsrfGuard)
  async gradeSyncRun(@Req() r: AuthRequest) {
    return this.gradeSync.runForActor(r.auth);
  }

  @Get('provision/:id')
  detail(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.provision.getProvisionRequest(r.auth, id);
  }

  @Post('provision/:id/revoke')
  @UseGuards(CsrfGuard)
  revoke(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.provision.revokeProvisionRequest(
      r.auth,
      id,
      body.reason ?? 'Revoked by requester.',
    );
  }

  /**
   * Issue an entitlement-checked launch for a student to open a Moodle
   * course without logging in twice. Entitlement (not token age) decides
   * access; every attempt is audited.
   */
  @Post('launch')
  @UseGuards(CsrfGuard)
  issueLaunch(
    @Req() r: AuthRequest,
    @Body() body: { studentId?: string; courseRegistrationId?: string; courseId?: string; shellRef?: string },
  ) {
    return this.launchService.createLaunchToken(r.auth, {
      studentId: body.studentId ?? null,
      courseId: body.courseRegistrationId ?? body.courseId ?? null,
      shellRef: body.shellRef ?? null,
    });
  }
}
