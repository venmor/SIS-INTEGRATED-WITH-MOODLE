import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';

// Phase 8 slice 1 notification DTOs (TASK-PH8-001). Templates carry
// versioned event wording; records carry the §16.11 required fields;
// every mutation carries an idempotency key.
export class CreateTemplateDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  event!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
  @IsOptional()
  @IsString()
  @MaxLength(120)
  actionLabel?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  office!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  category!: string;
  @Type(() => Boolean)
  @IsBoolean()
  mandatory!: boolean;
}

export class CreateRecordDto extends KeyDto {
  @IsUUID()
  templateId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  event!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
  @IsOptional()
  @IsString()
  @MaxLength(256)
  actionPath?: string;
  @IsOptional()
  @IsString()
  @MaxLength(120)
  office?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  category!: string;
  @Type(() => Boolean)
  @IsBoolean()
  mandatory!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(64)
  recipientAccountId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  recipientRole?: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  scopeType?: string;
  @IsOptional()
  @IsString()
  @MaxLength(64)
  scopeRef?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  dedupeKey!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  channels?: string[];
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  simulateFailure?: boolean;
}

export class ListRecordsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  status?: string;
}

export class ListTemplatesQuery {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  event?: string;
}

export class ListSignalsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  status?: string;
}

export class SuppressDto extends KeyDto {
  @Type(() => Boolean)
  @IsBoolean()
  optedOut!: boolean;
}
