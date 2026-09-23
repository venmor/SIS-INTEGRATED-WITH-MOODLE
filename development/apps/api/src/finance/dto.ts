import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';

// Phase 5 slice 1 assessment DTOs (TASK-PH5-001). Finance officers name the
// attempt they assess; students use the invoice read with no attempt.
export class AssessChargesDto extends KeyDto {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
}

export class InvoiceQuery {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
}

// Phase 5 slice 3 payment DTOs (TASK-PH5-003). Initiation names a demo
// method and an optional simulator scenario; offline reports carry the
// payer's reference and never mark anything paid.
export class InitiatePaymentDto extends KeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsOptional()
  @IsInt()
  amountMinor?: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  method!: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  scenario?: string;
}

export class ReportPaymentDto extends KeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsInt()
  amountMinor!: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  method!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  payerReference!: string;
}

export class PaymentQuery {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
}

// Phase 5 slice 4 callback DTOs (TASK-PH5-004). The simulator signs every
// callback; the service verifies signature, replay window, amount,
// currency, reference and duplicate state before anything moves.
export class CallbackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  provider!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  providerRef!: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  requestReference?: string;
  @IsInt()
  amountMinor!: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  currency!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  status!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  occurredAt!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nonce!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  signature!: string;
}

export class DispatchDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  requestReference!: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  outcome?: string;
}

// Phase 5 slice 6 governance DTOs (TASK-PH5-006). Officers resolve cases,
// record sponsorships and request adjustments; approvers decide
// adjustments and arrangements; students request arrangements.
export class ResolveCaseDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  action!: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  requestReference?: string;
  @IsOptional()
  @IsInt()
  acceptedAmountMinor?: number;
}

export class RecordSponsorshipDto extends KeyDto {
  @IsUUID()
  attemptId!: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  sponsorName!: string;
  @IsArray()
  @IsString({ each: true })
  categories!: string[];
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  coverageType!: string;
  @IsInt()
  coverageValue!: number;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidenceNote?: string;
  @IsOptional()
  @IsString()
  effectiveFrom?: string;
  @IsOptional()
  @IsString()
  effectiveTo?: string;
}

export class UpdateSponsorshipDto extends KeyDto {
  @IsOptional()
  @IsInt()
  coverageValue?: number;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidenceNote?: string;
  @IsOptional()
  @IsString()
  effectiveTo?: string;
}

export class RequestAdjustmentDto extends KeyDto {
  @IsUUID()
  attemptId!: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  kind!: string;
  @IsInt()
  amountMinor!: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidenceNote?: string;
}

export class DecideAdjustmentDto extends KeyDto {
  @IsBoolean()
  approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
  @IsOptional()
  @IsString()
  @MaxLength(64)
  payoutReference?: string;
}

export class RequestArrangementDto extends KeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  terms!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}

export class DecideArrangementDto extends KeyDto {
  @IsBoolean()
  approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CashIntakeDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  requestReference!: string;
  @IsInt()
  amountMinor!: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  cashReceiptNo!: string;
}

export class CashConfirmDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  requestReference!: string;
}
