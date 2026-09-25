import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
