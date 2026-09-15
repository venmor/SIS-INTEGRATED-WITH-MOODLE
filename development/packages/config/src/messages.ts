/**
 * AUTH-* message templates (04/07 content ownership: template IDs, versions,
 * owners — never embedded wording). Sign-in failure sentence is verbatim per
 * UI-FIELD-003 §14.7; rate-limit sentence verbatim per §16.9.
 */
export interface MessageTemplate {
  id: string;
  version: string;
  owner: string;
  text: string;
}

function template(id: string, text: string): MessageTemplate {
  return { id, version: "v1", owner: "Lead Charles (demo)", text };
}

export const AUTH_MESSAGES = {
  signInFailure: template(
    "AUTH-SIGNIN-001",
    "We could not sign you in with those details. Check them and try again, or reset your password.",
  ),
  rateLimited: template(
    "AUTH-RATELIMIT-001",
    "We cannot complete this action right now. For your security, try again later or use the account-recovery route.",
  ),
  recoveryRequested: template(
    "AUTH-RECOVERY-001",
    "If an account matches, recovery instructions are on their way. Otherwise no account exists with those details.",
  ),
  recoveryLinkExpired: template(
    "AUTH-RECOVERY-002",
    "This recovery link has expired or was already used. Request a fresh one to continue.",
  ),
  passwordChanged: template(
    "AUTH-RECOVERY-003",
    "Your password was changed. Other signed-in devices were signed out for your security.",
  ),
  signedOut: template(
    "AUTH-SIGNOUT-001",
    "You are signed out.",
  ),
  workspaceSwitched: template(
    "WORKSPACE-001",
    "Workspace switched. Your active role and scope changed.",
  ),
  grantCreated: template(
    "WORKSPACE-002",
    "Role assignment created. The person can use it within its effective period.",
  ),
  grantDenied: template(
    "WORKSPACE-003",
    "This change was not completed. Check the details and try again, or ask an administrator.",
  ),
  scopedEmpty: template(
    "WORKSPACE-004",
    "No records available in your current role and scope.",
  ),
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
