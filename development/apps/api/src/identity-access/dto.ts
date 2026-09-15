import { IsString, MaxLength, MinLength } from 'class-validator';
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
