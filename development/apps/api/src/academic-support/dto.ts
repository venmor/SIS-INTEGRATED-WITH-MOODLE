import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  Matches,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAcademicRequestDto {
  @IsUUID() idempotencyKey!: string;
  @IsIn(['ACADEMIC_ADVISING', 'COURSE_DIFFICULTY']) category!: string;
  @IsIn(['PORTAL']) contactMethod!: string;
  @IsOptional() @IsString() @MaxLength(500) details?: string;
  @IsBoolean() acknowledged!: boolean;
}

export class AcademicRequestPageDto {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) take?: number;
  @IsOptional()
  @IsIn([
    'ALL',
    'OPEN',
    'NEEDS_REPLY',
    'RECEIVED',
    'STUDENT_REPLIED',
    'ADVISER_REPLIED',
    'CLOSED',
  ])
  status?: string;
  @IsOptional() @Matches(/^SUP-[A-F0-9]{8}$/i) reference?: string;
}

export class AcademicActionPageDto {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) take?: number;
  @IsOptional()
  @IsIn(['ALL_OPEN', 'PAST_TARGET', 'NEEDS_CONFIRMATION'])
  view?: 'ALL_OPEN' | 'PAST_TARGET' | 'NEEDS_CONFIRMATION';
}

export class AcademicReplyDto {
  @IsUUID() idempotencyKey!: string;
  @IsString() @MaxLength(1000) body!: string;
}

export class ProposeAcademicActionDto {
  @IsUUID() idempotencyKey!: string;
  @IsString() @MaxLength(120) title!: string;
  @IsString() @MaxLength(500) explanation!: string;
  @IsIn(['COURSES', 'REGISTRATION', 'SUPPORT']) routeKey!:
    'COURSES' | 'REGISTRATION' | 'SUPPORT';
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dueOn!: string;
}

export class RespondAcademicActionDto {
  @IsUUID() idempotencyKey!: string;
  @IsBoolean() accept!: boolean;
}

export class AcademicActionKeyDto {
  @IsUUID() idempotencyKey!: string;
}

export class CloseAcademicRequestDto {
  @IsUUID() idempotencyKey!: string;
  @IsIn(['GUIDANCE_GIVEN', 'COURSE_PLAN_RESOLVED', 'AGREED_ACTION_COMPLETED'])
  reason!:
    'GUIDANCE_GIVEN' | 'COURSE_PLAN_RESOLVED' | 'AGREED_ACTION_COMPLETED';
}
