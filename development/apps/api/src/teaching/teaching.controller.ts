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
import { TeachingService } from './teaching.service.js';
import {
  AllocateStudentDto,
  AssignTeachingDto,
  CreateGroupDto,
  DecideAssignmentDto,
  QuizAuthorityQuery,
} from './dto.js';
import { KeyDto } from '../admissions/dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

// Phase 6 slice 0 teaching API (TASK-PH6-000). Coordinator-managed
// tutorial groups and teaching assignments; students read assigned only.
@Controller('teaching')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class TeachingController {
  constructor(private readonly teaching: TeachingService) {}

  @Post('groups')
  @UseGuards(CsrfGuard)
  createGroup(@Req() r: AuthRequest, @Body() dto: CreateGroupDto) {
    return this.teaching.createGroup(r.auth, dto.idempotencyKey, {
      offeringId: dto.offeringId,
      name: dto.name,
      capacity: dto.capacity,
      meetingPattern: dto.meetingPattern,
      tutorRequirement: dto.tutorRequirement,
      venue: dto.venue,
      mode: dto.mode,
      allocationRule: dto.allocationRule,
    });
  }

  @Post('groups/:id/activate')
  @UseGuards(CsrfGuard)
  activateGroup(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.teaching.activateGroup(r.auth, dto.idempotencyKey, id);
  }

  @Post('groups/:id/close')
  @UseGuards(CsrfGuard)
  closeGroup(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.teaching.closeGroup(r.auth, dto.idempotencyKey, id);
  }

  @Post('groups/:id/allocate')
  @UseGuards(CsrfGuard)
  allocate(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AllocateStudentDto,
  ) {
    return this.teaching.allocateStudent(r.auth, dto.idempotencyKey, {
      groupId: id,
      studentNumber: dto.studentNumber,
      reason: dto.reason,
    });
  }

  @Post('allocations/:id/remove')
  @UseGuards(CsrfGuard)
  removeAllocation(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.teaching.removeAllocation(r.auth, dto.idempotencyKey, id);
  }

  @Post('assignments')
  @UseGuards(CsrfGuard)
  assign(@Req() r: AuthRequest, @Body() dto: AssignTeachingDto) {
    return this.teaching.assignTeaching(r.auth, dto.idempotencyKey, {
      username: dto.username,
      role: dto.role,
      offeringId: dto.offeringId,
      groupId: dto.groupId,
      capabilities: dto.capabilities,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
    });
  }

  @Post('assignments/:id/decide')
  @UseGuards(CsrfGuard)
  decide(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideAssignmentDto,
  ) {
    return this.teaching.decideAssignment(
      r.auth,
      dto.idempotencyKey,
      id,
      dto.approve,
    );
  }

  @Post('assignments/:id/end')
  @UseGuards(CsrfGuard)
  end(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.teaching.endAssignment(r.auth, dto.idempotencyKey, id);
  }

  @Get('quiz-authority')
  quizAuthority(@Req() r: AuthRequest, @Query() q: QuizAuthorityQuery) {
    return this.teaching.quizAuthority(r.auth, {
      accountId: q.accountId,
      groupId: q.groupId,
    });
  }

  @Get('groups')
  groups(@Req() r: AuthRequest) {
    return this.teaching.listGroups(r.auth);
  }

  @Get('groups/:id')
  groupDetail(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teaching.groupDetail(r.auth, id);
  }
}
