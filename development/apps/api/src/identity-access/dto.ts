import { ArrayMaxSize, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { SECURITY_V1 } from '@sis/config';

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
