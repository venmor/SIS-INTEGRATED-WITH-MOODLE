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
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type { Request } from 'express';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import { KeyDto } from '../admissions/dto.js';
import { MoodleLiveBindingsService } from './moodle-live-bindings.service.js';
class DraftLiveBindingDto extends KeyDto {
  @IsUUID() courseRegistrationId!: string;
  @IsIn(['SHELL', 'USER']) kind!: 'SHELL' | 'USER';
  @IsOptional() @IsInt() @Min(1) moodleId?: number;
}
class DecideLiveBindingDto extends KeyDto {
  @IsInt() @Min(1) version!: number;
  @IsOptional() @IsString() @MaxLength(256) password?: string;
}
interface R extends Request {
  auth: ActiveAuthority & { sessionToken: string };
}
@Controller('integration/live-bindings')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class MoodleLiveBindingsController {
  constructor(private readonly bindings: MoodleLiveBindingsService) {}
  @Get() list(@Req() r: R) {
    return this.bindings.sources(r.auth);
  }
  @Post() @UseGuards(CsrfGuard) draft(
    @Req() r: R,
    @Body() b: DraftLiveBindingDto,
  ) {
    return this.bindings.draft(r.auth, b);
  }
  @Post(':id/attest') @UseGuards(CsrfGuard) attest(
    @Req() r: R,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: DecideLiveBindingDto,
  ) {
    return this.bindings.decide(r.auth, id, b, true);
  }
  @Post(':id/activate') @UseGuards(CsrfGuard) activate(
    @Req() r: R,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: DecideLiveBindingDto,
  ) {
    return this.bindings.decide(r.auth, id, b, false);
  }
}
