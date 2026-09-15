import { IsArray, IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { SECURITY_V1 } from '@sis/config';

// Local DTOs (validation lives here, once). Canonical shapes live in
// @sis/contracts; structural compatibility is asserted by
// auth-contract.spec.ts (type-checked by editors/type-aware lint; specs are
// excluded from the build so cross-package .ts imports stay out of emit).
export class SignInDto {
  @IsString()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MaxLength(256)
  password!: string;
}

export class RecoveryRequestDto {
  @IsString()
  @MaxLength(64)
  username!: string;
}

export class RecoveryConfirmDto {
  @IsString()
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

export class GrantRoleDto {
  @IsString()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MaxLength(32)
  role!: string;

  @IsString()
  @MaxLength(32)
  scopeType!: string;

  @IsString()
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
  @MaxLength(128)
  appointmentRef!: string;

  @IsString()
  @MaxLength(128)
  authoritySource!: string;

  @IsOptional()
  @IsArray()
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

  @IsOptional()
  @IsUUID()
  approverId?: string;

  @IsString()
  @MaxLength(512)
  reason!: string;
}
