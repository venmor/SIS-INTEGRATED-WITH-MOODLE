// reflect-metadata must load before any decorator below executes:
// class-transformer's @Type (query-number coercion) reads metadata at
// decoration time, and unit specs import this module without Nest's
// transitive polyfill.
import 'reflect-metadata';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SECURITY_V1 } from '@sis/config';

// Packet-local anti-garbage floor for free-text reasons/evidence (§12.13,
// §15.20 "reasoned"): trimmed, minimum 8 characters. Codes and identifiers
// (incident refs, scopes) keep exact-match validation instead.

// Local DTOs (validation lives here, once). Canonical shapes live in
// @sis/contracts; structural compatibility is asserted by
// auth-contract.spec.ts (type-checked by editors/type-aware lint; specs are
// excluded from the build so cross-package .ts imports stay out of emit).
export class SignInDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MaxLength(256)
  password!: string;
}

export class RecoveryRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;
}

export class RecoveryConfirmDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;

  @IsString()
  @MinLength(SECURITY_V1.passwordPolicy.minLength)
  @MaxLength(256)
  newPassword!: string;
}

export class SwitchWorkspaceDto {
  @IsUUID()
  assignmentId!: string;
}

export class ResolveGrantTargetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;
}

export class GrantRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  role!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  scopeType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  scopeRef!: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  // §12.9 requires appointment evidence + authority source on the form;
  // missing evidence never yields a privileged workspace (§12.13).
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  appointmentRef!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  authoritySource!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  employmentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  delegationLimit?: string;

  // §12.9 requires an approver; single-step demo grants record the
  // authorizing approver here (must be a real account, never the target).
  @IsUUID()
  approverId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  reason!: string;

  // UI-SUBMIT-001: client-generated key per form open; repeats return the
  // stored receipt instead of re-applying the effect.
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

// Slice-5 quarterly access review (handbook §12.12, REQ-IAM-002/003).
export const REVIEW_DECISIONS = [
  'confirm',
  'reduce',
  'reassign',
  'revoke',
  'clarify',
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export class DecideReviewDto {
  @IsIn([...REVIEW_DECISIONS])
  decision!: ReviewDecision;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(8)
  @MaxLength(512)
  reason!: string;
}

export class ReviewQueryDto {
  @IsOptional()
  @IsIn(['high', 'medium', 'low'])
  riskLevel?: string;

  @IsOptional()
  @IsIn(['pending', 'completed'])
  status?: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

// Slice-5 controlled reinstatement (handbook §12.13: reason + audit, never
// history edit). The target is the REVOKED assignment id; the service mints
// a new live row carrying the prior authority forward.
export class ReinstateDto {
  @IsUUID()
  assignmentId!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(8)
  @MaxLength(512)
  reason!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(8)
  @MaxLength(512)
  evidence!: string;
}

// Slice-5 emergency access (handbook §15.20/§12.11, REQ-SUP-005). Minimal,
// time-bound, reasoned, incident-scoped, approver-gated (never self).
export class BreakGlassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  incidentRef!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(8)
  @MaxLength(512)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  scope!: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;

  @IsUUID()
  approverId!: string;
}

// Slice-5 post-use review (§15.20 "reviewed"). The reviewer closes the
// incident audit chain with an outcome and a note.
export const BREAK_GLASS_OUTCOMES = [
  'justified',
  'excessive',
  'breach',
] as const;
export type BreakGlassOutcome = (typeof BREAK_GLASS_OUTCOMES)[number];

export class ReviewBreakGlassDto {
  @IsIn([...BREAK_GLASS_OUTCOMES])
  outcome!: BreakGlassOutcome;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(8)
  @MaxLength(512)
  note!: string;
}

// Slice-5 audit timeline (handbook §15.19 admin rows, §14.26 timeline).
// Server-side filtering + pagination; unknown keys are refused (whitelist).
export class AuditTimelineQueryDto {
  @IsOptional()
  @IsUUID()
  actorAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  scope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
