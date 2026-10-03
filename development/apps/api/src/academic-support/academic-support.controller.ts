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
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { AcademicSupportService } from './academic-support.service.js';
import {
  AcademicReplyDto,
  AcademicActionPageDto,
  AcademicActionKeyDto,
  AcademicRequestPageDto,
  CreateAcademicRequestDto,
  CloseAcademicRequestDto,
  ProposeAcademicActionDto,
  RespondAcademicActionDto,
} from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority;
}

@Controller('support')
@UseGuards(SessionGuard)
export class AcademicSupportController {
  constructor(private readonly support: AcademicSupportService) {}

  @Get('me') readiness(@Req() request: AuthRequest) {
    return this.support.readiness(request.auth);
  }

  @Get('me/requests') mine(
    @Req() request: AuthRequest,
    @Query() query: AcademicRequestPageDto,
  ) {
    return this.support.mine(request.auth, query);
  }

  @Post('me/requests')
  @UseGuards(CsrfGuard)
  create(@Req() request: AuthRequest, @Body() body: CreateAcademicRequestDto) {
    return this.support.create(request.auth, body);
  }

  @Get('me/requests/:id')
  myCase(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.myCase(request.auth, id);
  }

  @Post('me/requests/:id/replies')
  @UseGuards(CsrfGuard)
  studentReply(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AcademicReplyDto,
  ) {
    return this.support.reply(request.auth, id, body, 'STUDENT');
  }

  @Get('assigned') assigned(
    @Req() request: AuthRequest,
    @Query() query: AcademicRequestPageDto,
  ) {
    return this.support.assigned(request.auth, query);
  }

  @Get('assigned/actions') assignedActions(
    @Req() request: AuthRequest,
    @Query() query: AcademicActionPageDto,
  ) {
    return this.support.assignedActions(request.auth, query);
  }

  @Get('assigned/:id')
  assignedCase(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.support.assignedCase(request.auth, id);
  }

  @Post('assigned/:id/replies')
  @UseGuards(CsrfGuard)
  adviserReply(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AcademicReplyDto,
  ) {
    return this.support.reply(request.auth, id, body, 'ADVISER');
  }

  @Post('assigned/:id/close')
  @UseGuards(CsrfGuard)
  closeCase(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseAcademicRequestDto,
  ) {
    return this.support.closeCase(request.auth, id, body);
  }

  @Post('assigned/:id/actions')
  @UseGuards(CsrfGuard)
  proposeAction(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ProposeAcademicActionDto,
  ) {
    return this.support.proposeAction(request.auth, id, body);
  }

  @Post('me/requests/:id/actions/:actionId/response')
  @UseGuards(CsrfGuard)
  respondAction(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() body: RespondAcademicActionDto,
  ) {
    return this.support.respondAction(request.auth, id, actionId, body);
  }

  @Post('me/requests/:id/actions/:actionId/claim')
  @UseGuards(CsrfGuard)
  claimAction(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() body: AcademicActionKeyDto,
  ) {
    return this.support.transitionAction(
      request.auth,
      id,
      actionId,
      body,
      'STUDENT_CLAIMED',
    );
  }

  @Post('assigned/:id/actions/:actionId/confirm')
  @UseGuards(CsrfGuard)
  confirmAction(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() body: AcademicActionKeyDto,
  ) {
    return this.support.transitionAction(
      request.auth,
      id,
      actionId,
      body,
      'ADVISER_CONFIRMED',
    );
  }
}
