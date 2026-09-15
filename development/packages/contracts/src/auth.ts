/**
 * Canonical auth shapes (single source). API DTOs implement these interfaces;
 * structural compatibility is asserted by a type-level spec (see api), because
 * cross-package value imports would break isolated builds — documented in
 * NOTE-PH1-002a. No validation logic here (DTOs own it, once).
 */

export interface SignInBody {
  username: string;
  password: string;
}

export interface AuthAccount {
  accountId: string;
  personId: string;
  username: string;
  displayName: string;
}

export interface SignInResponse {
  account: AuthAccount;
  message: string;
}

export interface RecoveryRequestBody {
  username: string;
}

export interface RecoveryConfirmBody {
  token: string;
  newPassword: string;
}

export interface RecoveryResponse {
  message: string;
}
