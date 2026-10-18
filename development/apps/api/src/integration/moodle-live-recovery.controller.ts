import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import type { SessionAuthority } from '../identity-access/transaction-session.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import { KeyDto } from '../admissions/dto.js';
import { MoodleLiveRecoveryService } from './moodle-live-recovery.service.js';
class RetryLiveDeliveryDto extends KeyDto {
  @IsString() @MinLength(10) @MaxLength(500) reason!: string;
}
interface RecoveryRequest extends Request {
  auth: SessionAuthority;
}
@Controller('integration/live-bindings/deliveries')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class MoodleLiveRecoveryController {
  constructor(private readonly recovery: MoodleLiveRecoveryService) {}
  @Get() list(@Req() r: RecoveryRequest) { return this.recovery.list(r.auth); }
  @Post(':id/retry') @UseGuards(CsrfGuard) retry(
    @Req() r: RecoveryRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RetryLiveDeliveryDto,
  ) {
    return this.recovery.retry(r.auth, id, input);
  }
}
