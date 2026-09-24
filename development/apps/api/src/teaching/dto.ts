import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';

// Phase 6 slice 0 teaching DTOs (TASK-PH6-000). Coordinators manage
// tutorial groups and teaching assignments; every mutation carries an
// idempotency key.
export class CreateGroupDto extends KeyDto {
  @IsUUID()
  offeringId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name!: string;
  @IsInt()
  @Min(1)
  capacity!: number;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  meetingPattern?: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tutorRequirement?: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venue?: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  mode?: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  allocationRule?: string;
}

export class AllocateStudentDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  studentNumber!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}

export class AssignTeachingDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  role!: string;
  @IsOptional()
  @IsUUID()
  offeringId?: string;
  @IsOptional()
  @IsUUID()
  groupId?: string;
  @IsString({ each: true })
  capabilities!: string[];
  @IsOptional()
  @IsString()
  effectiveFrom?: string;
  @IsOptional()
  @IsString()
  effectiveTo?: string;
}

export class DecideAssignmentDto extends KeyDto {
  @IsBoolean()
  approve!: boolean;
}

export class QuizAuthorityQuery {
  @IsOptional()
  @IsUUID()
  accountId?: string;
  @IsOptional()
  @IsUUID()
  groupId?: string;
}
