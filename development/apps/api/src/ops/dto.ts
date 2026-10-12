import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';

// Phase 8 slice 3 ops DTOs (TASK-PH8-003). Incidents open manually or
// from dead-letters; transitions carry versions; every mutation
// carries an idempotency key.
export const OPS_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class OpenIncidentDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(200)
  title!: string;
  @IsString()
  @IsIn([...OPS_SEVERITIES])
  severity!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sourceRef!: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detail?: string;
}

export class AcknowledgeIncidentDto extends KeyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetResponseAt?: string;
}

export class ResolveIncidentDto extends KeyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(2000)
  rootCause!: string;
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(2000)
  recoveryEvidence!: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  preventiveAction?: string;
}

export class CloseIncidentDto extends KeyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class SweepDeadLettersDto extends KeyDto {
  @IsUUID()
  attemptId!: string;
}

export class ListIncidentsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  status?: string;
  @IsOptional()
  // Query strings arrive as text: Boolean('false') is true, so
  // coerce explicitly instead of @Type(() => Boolean).
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  openOnly?: boolean;
}
