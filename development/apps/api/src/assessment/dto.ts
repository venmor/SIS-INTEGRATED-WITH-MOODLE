import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { KeyDto, VersionDto } from '../admissions/dto.js';

// Phase 7 slice 4: the exact submission declaration (UI-DECISION-001
// pattern). The server refuses any other wording before storing.
export const SUBMISSION_DECLARATION =
  'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.';

// Phase 7 slices 1–2 assessment DTOs (TASK-PH7-001/002). Plans carry the
// demo scheme components; batches carry staged lines with outcome codes;
// every mutation carries an idempotency key and version-checked writes
// carry the reviewed version.
export class PlanComponentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMark!: number;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  weight!: number;
}

export class DraftPlanDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  offeringRef!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  periodCode!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PlanComponentDto)
  components!: PlanComponentDto[];
}

export class ApprovePlanDto extends VersionDto {}

export class ListPlansQuery {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  offeringRef?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  periodCode?: string;
}

export class DraftGradeMappingDto extends KeyDto {
  @IsUUID()
  componentId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  moodleActivityId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  moodleCourseRef!: string;
}

export class ListMappingsQuery {
  @IsOptional()
  @IsUUID()
  componentId?: string;
}

export class StageLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  studentRef!: string;
  @IsOptional()
  @Type(() => Number)
  rawValue?: number;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  outcome?: string;
}

export class StageBatchDto extends KeyDto {
  @IsUUID()
  mappingId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sourceRevision!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => StageLineDto)
  lines!: StageLineDto[];
}

export class ListBatchesQuery {
  @IsOptional()
  @IsUUID()
  mappingId?: string;
}

export class TransitionFindingDto extends KeyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  to!: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ListFindingsQuery {
  @IsOptional()
  @IsUUID()
  batchId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  status?: string;
}

export class SubmitBatchDto extends KeyDto {
  @IsString()
  @Equals(SUBMISSION_DECLARATION)
  declaration!: string;
}

export class DecideCaseDto extends KeyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to!: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CandidateListDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  offeringRef!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  periodCode!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  studentRefs!: string[];
}

export class ListModerationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;
}

// Phase 7 slice 5: the exact board-package declaration (UI-DECISION-001
// pattern). The server refuses any other wording before storing.
export const PACKAGE_DECLARATION =
  'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.';

// Phase 7 slice 5 board outcomes (TASK-PH7-005): approve-for-release,
// return, clarify, condition, defer, refer — with reasons, date and
// authority. Stored UPPER_SNAKE; presented to staff in board wording.
export const BOARD_DECISIONS = [
  'APPROVE_FOR_RELEASE',
  'RETURN',
  'CLARIFY',
  'CONDITION',
  'DEFER',
  'REFER',
] as const;

export class AssemblePackageDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  offeringRef!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  periodCode!: string;
  @IsString()
  @Equals(PACKAGE_DECLARATION)
  declaration!: string;
}

export class DecidePackageDto extends KeyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to!: string;
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
  @IsOptional()
  @IsArray()
  conditions?: Array<Record<string, unknown>>;
}

export class ListPackagesQuery {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  offeringRef?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  periodCode?: string;
}

// Phase 7 slice 6: official release (TASK-PH7-006). Release targets one
// board-approved package; all release inputs freeze at assembly time.
export class ReleaseResultsDto extends KeyDto {
  @IsUUID()
  packageId!: string;
}
