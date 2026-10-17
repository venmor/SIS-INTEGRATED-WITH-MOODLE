import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  Injectable,
  HttpException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../identity-access/session.guard.js';
import { RateLimiter } from '../identity-access/rate-limit.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import {
  MoodleLiveRunService,
  type MoodleRunActor,
} from './moodle-live-run.service.js';
import {
  AddMoodleManifestEntryDto,
  MoodleRunCommandDto,
  PrepareMoodleRunDto,
  MoodleRunReceiptDto,
} from './moodle-live-run.dto.js';

interface RunRequest extends Request {
  auth: MoodleRunActor;
}
@Injectable()
export class MoodleRunRateGuard implements CanActivate {
  private readonly limiter = new RateLimiter();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RunRequest>();
    const response = context.switchToHttp().getResponse();
    response.setHeader('Cache-Control', 'no-store');
    const limit = RateLimiter.readLimit();
    const result = this.limiter.check(
      request.auth.accountId,
      limit.maxAttempts,
      limit.windowMinutes,
    );
    if (!result.allowed) {
      response.setHeader('Retry-After', result.retryAfterSeconds);
      throw new HttpException('MOODLE_RUN_RATE_LIMITED', 429);
    }
    return true;
  }
}
@Controller('integration/live-test')
@UseGuards(SessionGuard, MoodleRunRateGuard)
export class MoodleLiveRunController {
  constructor(private readonly runs: MoodleLiveRunService) {}
  @Get('setup') setup(@Req() r: RunRequest) {
    return this.runs.setup(r.auth);
  }
  @Get('runs/current') current(@Req() r: RunRequest) {
    return this.runs.current(r.auth);
  }
  @Get('runs/:id') detail(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.runs.detail(r.auth, id);
  }
  @Post('runs')
  @UseGuards(CsrfGuard)
  prepare(@Req() r: RunRequest, @Body() dto: PrepareMoodleRunDto) {
    return this.runs.prepare(r.auth, dto);
  }
  @Post('runs/:id/reauthenticate')
  @UseGuards(CsrfGuard)
  reauthenticate(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunReceiptDto,
  ) {
    return this.runs.issueReceipt(r.auth, id, dto);
  }
  @Post('runs/:id/manifest/entries')
  @UseGuards(CsrfGuard)
  entry(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMoodleManifestEntryDto,
  ) {
    return this.runs.command(r.auth, id, 'add-entry', dto);
  }
  @Post('runs/:id/manifest/seal')
  @UseGuards(CsrfGuard)
  seal(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'seal', dto);
  }
  @Post('runs/:id/technical-approval')
  @UseGuards(CsrfGuard)
  technical(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'technical-approval', dto);
  }
  @Post('runs/:id/start')
  @UseGuards(CsrfGuard)
  start(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'start', dto);
  }
  @Post('runs/:id/pause')
  @UseGuards(CsrfGuard)
  pause(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'pause', dto);
  }
  @Post('runs/:id/resume')
  @UseGuards(CsrfGuard)
  resume(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'resume', dto);
  }
  @Post('runs/:id/fail')
  @UseGuards(CsrfGuard)
  fail(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'fail', dto);
  }
  @Post('runs/:id/complete')
  @UseGuards(CsrfGuard)
  complete(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'complete', dto);
  }
  @Post('runs/:id/close-technical')
  @UseGuards(CsrfGuard)
  closeTechnical(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'close-technical', dto);
  }
  @Post('runs/:id/close')
  @UseGuards(CsrfGuard)
  close(
    @Req() r: RunRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoodleRunCommandDto,
  ) {
    return this.runs.command(r.auth, id, 'close', dto);
  }
}
