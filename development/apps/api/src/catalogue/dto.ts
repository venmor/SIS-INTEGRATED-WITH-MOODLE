import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CATALOGUE_V1 } from '@sis/config';

// Local DTOs (validation lives here, once). Canonical output shapes live in
// @sis/contracts (TASK-PH2-001 source map). Filter vocabulary mirrors Part 2
// §3.1 labelled controls; availability uses the handbook states.

export class SearchCatalogueQuery {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  school?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  campus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  intake?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  route?: string;

  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'SOON', 'CLOSED', 'RETIRED'])
  availability?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CATALOGUE_V1.search.maxTake)
  take?: number;
}

export class CompareQuery {
  @IsString()
  @MinLength(36)
  @MaxLength(500)
  ids!: string;
}

export class CreateGuidanceSessionBody {
  @IsUUID('4')
  offeringId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  routeCode!: string;
}

export class EvaluateGuidanceBody {
  @IsUUID('4')
  sessionId!: string;

  @IsObject()
  facts!: Record<string, unknown>;
}

export function cappedTake(requested: number | undefined): number {
  return Math.min(
    requested ?? CATALOGUE_V1.search.defaultTake,
    CATALOGUE_V1.search.maxTake,
  );
}
