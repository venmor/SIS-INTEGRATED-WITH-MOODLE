import { Injectable } from '@nestjs/common';
import { SECURITY_V1 } from '@sis/config';

// Central §15.21 evaluator (slice 4): allow only when every arm holds,
// deny by default. Pure function — demo verb/SoD data injectable for tests,
// defaulting to SECURITY-v1 (packet-local values, never handbook baselines).
// Scope-containment hierarchy and delegation windows are GAP-001/GAP-004;
// arms evaluate only what handbook + demo concretely define.
export interface PolicyInput {
  action: string;
  activeRole: string | null;
  scope?: string | null;
  assignmentLive?: boolean;
  actorRoles?: string[];
  approverAccountId?: string | null;
  targetAccountId?: string | null;
  approverRequired?: boolean;
  policy?: { verbs: Record<string, string[]>; sodPairs: [string, string][] };
}

export interface PolicyDecision {
  allow: boolean;
  reason: string | null;
}

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const policy = input.policy ?? {
    verbs: SECURITY_V1.policyVerbs,
    sodPairs: SECURITY_V1.sodPairs,
  };
  // Arm 1: active role is valid (live assignment resolved by the guard).
  if (!input.activeRole) return { allow: false, reason: 'role-invalid' };
  // Incident-only emergency access never confers ordinary IAM powers.
  // Safe own-session reads and deliberate workspace switching remain usable.
  if (
    input.scope?.startsWith('BREAK_GLASS:') &&
    !['iam.me.read', 'iam.workspace.switch'].includes(input.action)
  ) {
    return { allow: false, reason: 'emergency-scope-restricted' };
  }
  // Arm 2: role contains the requested verb (unknown actions deny).
  const verbs = policy.verbs[input.action];
  if (!verbs || !verbs.includes(input.activeRole))
    return { allow: false, reason: 'verb-denied' };
  // Arm 3: assignment is live (revoked/expired/never-chosen denies).
  if (input.assignmentLive === false)
    return { allow: false, reason: 'assignment-inactive' };
  // Arm 4: no SoD conflict among held roles.
  const held = new Set(input.actorRoles ?? [input.activeRole]);
  for (const [left, right] of policy.sodPairs) {
    if (held.has(left) && held.has(right))
      return { allow: false, reason: 'sod-conflict' };
  }
  // Arm 5: no self-approval; approver present where required.
  if (
    input.approverAccountId &&
    input.targetAccountId &&
    input.approverAccountId === input.targetAccountId
  ) {
    return { allow: false, reason: 'self-approval' };
  }
  if (input.approverRequired && !input.approverAccountId) {
    return { allow: false, reason: 'approver-required' };
  }
  return { allow: true, reason: null };
}

@Injectable()
export class PolicyService {
  evaluate(input: PolicyInput): PolicyDecision {
    return evaluatePolicy(input);
  }
}

/**
 * Account-status gate (§11.1 seven states + legacy markers). Comparison is
 * case-insensitive: the seed stores `ACTIVE`/`LOCKED` (slices 1-3) while the
 * handbook names states `Active`/`Closed`/…. Only Active authorizes; Closed
 * never signs in; every other state denies generically because the
 * step-up/verification flows those states imply do not exist yet
 * (documented demo limit, not a handbook bypass). The timed lockedUntil
 * mechanism is preserved alongside the LOCKED marker.
 */
export function accountStatusPolicy(status: string): {
  allow: boolean;
  reason: string | null;
} {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE') return { allow: true, reason: null };
  if (normalized === 'CLOSED')
    return { allow: false, reason: 'account-closed' };
  return { allow: false, reason: 'account-inactive' };
}
