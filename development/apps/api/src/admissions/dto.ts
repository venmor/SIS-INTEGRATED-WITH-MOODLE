import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
export class KeyDto {
  @IsUUID() idempotencyKey!: string;
}
export class VersionDto extends KeyDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
export class ConfirmDto extends VersionDto {
  @IsBoolean() confirmed!: boolean;
}
export class StartDto extends KeyDto {
  @IsUUID() offeringId!: string;
  @IsBoolean() confirmed!: boolean;
}
export class SaveDto extends VersionDto {
  @IsOptional() @IsBoolean() confirmImpact?: boolean;
  @IsObject() data!: Record<string, unknown>;
  @IsBoolean() complete!: boolean;
}
export class ChangeDto extends ConfirmDto {
  @IsUUID() offeringId!: string;
}
export class DocumentDto extends VersionDto {
  @IsString() @MaxLength(100) category!: string;
  @IsOptional() @IsUUID() replacesId?: string;
  @IsOptional() @IsString() @MaxLength(500) replacementReason?: string;
}
class DeclarationDto {
  @IsString() @MaxLength(50) id!: string;
  @IsString() @MaxLength(80) version!: string;
  @IsBoolean() accepted!: boolean;
}
export class SubmitDto extends ConfirmDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DeclarationDto)
  declarations!: DeclarationDto[];
}
// Slice 6 post-submit case DTOs (Part 9). Same idempotency pattern as draft
// writes, plus expected version: the client sends the timeline version it
// reviewed, and stale versions conflict instead of silently applying.
// Scopes/categories validated against demo policy in the service.
export class ClarificationRespondDto extends VersionDto {
  @IsString()
  @MaxLength(2000)
  response!: string;
}
export class CorrectionRequestDto extends VersionDto {
  @IsString()
  @MaxLength(32)
  section!: string;
  @IsString()
  @MaxLength(80)
  field!: string;
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
export class WithdrawDto extends VersionDto {
  @IsBoolean() confirmed!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
export class TicketDto extends VersionDto {
  @IsString()
  @MaxLength(120)
  subject!: string;
  @IsString()
  @MaxLength(2000)
  message!: string;
}
export class TicketReplyDto extends VersionDto {
  @IsString()
  @MaxLength(2000)
  message!: string;
}
export class SimCorrectionDecisionDto extends KeyDto {
  @IsUUID() correctionId!: string;
  @IsBoolean() approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
// Phase 3 slice 1 staff queue DTOs (TASK-PH3-001). Claim/release carry the
// reviewed application version plus the idempotency key, matching the
// applicant case-write pattern.
export class ClaimReviewDto extends VersionDto {}
export class ReleaseReviewDto extends VersionDto {}
export class ReviewQueueQuery {
  @IsOptional()
  @IsIn(['mine', 'pool'])
  scope?: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  state?: string;
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  actionNeeded?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
// Phase 3 slice 2 comparison DTOs (TASK-PH3-002). Finding kinds/severities
// are demo enumerations; staff clarification mirrors the simulation shape
// with officer authority; correction decisions carry no version because the
// target is the request row, not the application version.
export class ReviewFindingDto extends VersionDto {
  @IsString()
  @IsIn([
    'COMPLETENESS',
    'DECLARATION_MISMATCH',
    'DOCUMENT_QUALITY',
    'PAYMENT_STATUS',
    'NOTE',
  ])
  kind!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  detail!: string;
  @IsString()
  @IsIn(['INFO', 'ACTION_NEEDED'])
  severity!: string;
}
export class StaffClarificationDto extends VersionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  deadlineDays?: number;
}
export class CorrectionDecideDto extends KeyDto {
  @IsBoolean() approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
export class SimClarificationDto extends KeyDto {
  @IsString()
  @MaxLength(1000)
  question!: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  deadlineDays?: number;
}
export class SimDecisionDto extends KeyDto {
  @IsString()
  @IsIn(['OFFERED', 'NOT_OFFERED', 'WAITLISTED'])
  outcome!: string;
  @IsString()
  @MaxLength(2000)
  message!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  conditions?: string[];
}
