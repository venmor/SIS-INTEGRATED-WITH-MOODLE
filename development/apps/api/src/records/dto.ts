import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';

// Phase 4 slice 2 conversion DTOs (TASK-PH4-002). Conversion targets the
// application row, so only the idempotency key travels; state and package
// checks run server-side inside the transaction.
export class ConvertDto extends KeyDto {}
export class ResolveMatchDto extends KeyDto {
  @IsString()
  @IsIn(['LINK_EXISTING', 'KEEP_SEPARATE'])
  decision!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
// Phase 4 slice 1 portal DTOs (TASK-PH4-001). Contact fields are optional
// individually but at least one must travel; the service enforces it.
// Correction fields are allow-listed (no free-form columns).
export class UpdateContactDto extends KeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
export class RequestCorrectionDto extends KeyDto {
  @IsString()
  @IsIn(['displayName', 'email', 'phone'])
  field!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  requestedValue!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
export class DecideCorrectionDto extends KeyDto {
  @IsBoolean() approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
