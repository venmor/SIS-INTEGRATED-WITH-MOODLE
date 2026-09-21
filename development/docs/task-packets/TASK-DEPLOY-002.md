# TASK-DEPLOY-002 — Clean Vercel builds and readable applicant access

Date: 2026-09-20. Scope authorized by the user's build-log, applicant-login, and unreadable-input report. Learning ownership follows the existing packets: Charles (lead), Chitindu Milimbo (reviewer); human walkthrough remains pending.

## Source and outcome

- TASK-PH0-003 / REQ-NFR-006–008: build the API from a fresh checkout, including its shared `@sis/config` dependency.
- TASK-PH1-002a / REQ-IAM-006: sign in through the existing username/password, session, selected-workspace and same-origin proxy flow.
- TASK-PH0-004 / UI-FIELD-001, UI-FIELD-003, UI-ACTION-001: visible input text, labels, states and keyboard focus in the existing CSS Modules design system.
- Exact UI foundations: [approved cross-blueprint Part 2A](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/002-cross-blueprint-implementation-set-part-2a-ui-system-foundations-and-input-components.md).
- Applicant identity and access remain subject to [GAP-015](../gaps/GAP-015-applicant-production-and-prior-phase-gates.md) and the exact applicant sources linked by the existing identity/applicant task packets.

## Bounded changes and proof

Fix dependency build ordering in the API workspace, exercise that same command in CI, ensure concurrent cold-start requests share initialization, repair light/dark browser form contrast, and make the seeded fictional applicant login discoverable only in explicit demo mode. Keep the approved proposed green/gold palette and semantic state meanings.

Verify a clean dependency build before and after the fix; API tests and concurrent initialization regression; frontend build; browser sign-in, programme search and input contrast in both OS color preferences; live API and frontend checks when the cloud deployment is reachable.

No new registration or identity proof provider, no authorization bypass, no account-state or shared database reset, no institutional policy approval, and no production-readiness claim. Any live demo test uses only the seeded fictional account. Commit locally under the user's prior authorization; the user retains Git push ownership.
