import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { KeyDto, VersionDto } from '../admissions/dto.js';

// Phase 4 slice 3 readiness query (TASK-PH4-003). Both filters are optional:
// students default to their latest attempt and the demo current period,
// records readers must name the attempt they review.
export class ReadinessQuery {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
}
// Phase 4 slice 4 course plan DTOs (TASK-PH4-004). Saving is draft-only;
// nothing official happens here. Course codes identify selections.
export class SavePlanDto extends VersionDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(16, { each: true })
  courseCodes!: string[];
}
export class PlanQuery {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
}
// Phase 4 slice 5 formal registration DTOs (TASK-PH4-005). The reviewed plan
// version must match the submitted version; declarations are required as a
// set against the versioned demo registration policy.
export class SubmitRegistrationDto extends VersionDto {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  declarations!: string[];
}
// Phase 4 slice 6 course-change DTOs (TASK-PH4-006). Changes name an
// explicit reason; evidence travels as a reference note (no file handling
// in this slice). Approval carries authority + impact in audit.
export class ChangeRequestDto extends KeyDto {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsString()
  @IsIn(['ADD', 'DROP'])
  kind!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  courseCode!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceNote?: string;
}
export class DecideAmendmentDto extends KeyDto {
  @IsBoolean() approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
export class JoinWaitlistDto extends KeyDto {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  courseCode!: string;
}
export class AcceptWaitlistDto extends KeyDto {
  @IsBoolean() approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
export class AmendmentQuery {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
}
