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
  signedOut: template("AUTH-SIGNOUT-001", "You are signed out."),
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
    "There are no records available in your current role and scope.",
  ),
  assignmentChanged: template(
    "WORKSPACE-005",
    "Your role assignment has changed. This action was not completed.",
  ),
  // Slice-5 packet-local outcomes (TASK-PH1-005 source map; handbook §12.11
  // banner copy and §12.12 sentence live here so no route invents wording).
  reinstated: template(
    "WORKSPACE-006",
    "Role assignment reinstated. The person can use it within its effective period.",
  ),
  breakGlassGranted: template(
    "WORKSPACE-007",
    "Emergency access granted. It expires automatically at the end of the approved period.",
  ),
  breakGlassReviewed: template(
    "WORKSPACE-008",
    "Emergency access review recorded. The incident audit chain is closed.",
  ),
  // Slice PH2-001 packet-local templates (TASK-PH2-001 source map; handbook
  // Part 2 copy lives here so no route invents wording).
  guidanceDisclaimer: template(
    "DISC-DISCLAIMER-001",
    "This is an initial guidance result based on the information you entered. Your application and documents will still be formally assessed.",
  ),
  noResults: template(
    "DISC-NO-RESULTS-001",
    "No programme matched your search. Try removing filters or browsing schools.",
  ),
  closedIntake: template(
    "DISC-CLOSED-001",
    "This programme is not accepting applications for the selected intake. The next planned intake is being confirmed.",
  ),
  guidanceUnavailable: template(
    "DISC-UNAVAILABLE-001",
    "Eligibility guidance is not available for this programme. Please review the entry requirements or contact Admissions.",
  ),
  unknownRoute: template(
    "DISC-ROUTE-001",
    "Unknown qualification route. Choose a listed route and try again.",
  ),
  sessionGone: template(
    "DISC-SESSION-001",
    "This guidance check expired or was not found. Start a new check to continue.",
  ),
  // Per-requirement verdict wordings, verbatim from the Part 2 §6.4 outcome
  // table (packet-local IDs; handbook owns the sentences).
  verdictMet: template(
    "DISC-VERDICT-MET-001",
    "Based on the information entered, you appear to meet the published minimum requirements.",
  ),
  verdictVerify: template(
    "DISC-VERDICT-VERIFY-001",
    "Your information may meet the requirements, but formal verification is required.",
  ),
  verdictMissing: template(
    "DISC-VERDICT-MISSING-001",
    "We need more information before providing guidance.",
  ),
  verdictNotMet: template(
    "DISC-VERDICT-NOTMET-001",
    "Based on the information entered, this programme's published minimum requirement is not yet met.",
  ),
  gradeHint: template(
    "DISC-GRADE-HINT-001",
    "Enter a grade from 1 to 9, or choose “I do not know this result yet.” Do not enter a percentage.",
  ),
  keptState: template(
    "DISC-KEPT-001",
    "What you entered is kept. Check your connection and try again.",
  ),
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
