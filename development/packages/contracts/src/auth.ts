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

/** One assignable workspace: a live role assignment in its scope/period. */
export interface WorkspaceAssignment {
  assignmentId: string;
  role: string;
  scopeType: string;
  scopeRef: string;
  startsAt: string;
  endsAt: string | null;
  employmentType: string | null;
}

/** Active workspace: the assignment this session currently acts under. */
export interface ActiveWorkspace {
  assignmentId: string;
  role: string;
  scopeType: string;
  scopeRef: string;
  /** Countdown-eligible expiry for the §12.11/§12.12 banners (slice 5). */
  endsAt: string | null;
}

export interface MeResponse {
  account: AuthAccount;
  workspaces: WorkspaceAssignment[];
  activeWorkspace: ActiveWorkspace | null;
}

export interface SwitchWorkspaceBody {
  assignmentId: string;
}

export interface SwitchWorkspaceResponse {
  activeWorkspace: ActiveWorkspace;
  message: string;
}

/** ACT-IAM-001 grant fields (§12.9 form). Username resolved server-side. */
export interface GrantRoleBody {
  username: string;
  role: string;
  scopeType: string;
  scopeRef: string;
  startsAt: string;
  endsAt?: string;
  appointmentRef: string;
  authoritySource: string;
  capabilities?: string[];
  employmentType?: string;
  delegationLimit?: string;
  approverId: string;
  reason: string;
  idempotencyKey?: string;
}

export interface GrantRoleResponse {
  assignmentId: string;
  message: string;
}

/** Exact-username grant-target resolve (minimized admin result). */
export interface ResolveGrantTargetBody {
  username: string;
}

export interface ResolveGrantTargetResponse {
  username: string;
  displayName: string;
}
