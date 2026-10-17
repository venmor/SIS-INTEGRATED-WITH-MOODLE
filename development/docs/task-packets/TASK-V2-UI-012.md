# TASK-V2-UI-012 — Direct entry to the current workspace

Date: 2026-10-15. Lead Charles Hangoma; reviewer Chitindu Milimbo. User-authorized presentation and own-session navigation change. Human walkthrough and release approval remain pending.

## Outcome and authority

The user requested removal of the first workspace-selection window after login. Successful sign-in opens the account's selected live role/scope workspace; a deliberate switch remains available from the sidebar. `/workspaces` is the explicit chooser and recovery page. `/` retains anonymous entry and routes an authenticated session to its current workspace. A validated explicit local `returnTo` remains the first destination, whose loader independently enforces authorization.

Read the complete exact [UI Constitution](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/04-engineering-foundation/001-section-19-part-1-ui-ux-design-constitution.md), [IAM Blueprint 12 Part 1](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/035-role-blueprint-12-part-1-system-administration-and-identity-access-administration.md), [Permission Part 3A](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/006-cross-blueprint-implementation-set-part-3a-permission-and-information-visibility-matrix-co.md), [Security Section 10](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/010-design-section-10-security-privacy-audit-records-and-resilience.md), and [Recovery Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/008-cross-blueprint-implementation-set-part-4-error-recovery-and-notification-catalogue.md). Supersession/readiness/open-production registers remain controlling. Original approvals are unchanged.

## Contract and boundaries

- Use `/auth/me.activeWorkspace`, role and scope; never a username, demo card or union of held permissions. Preserve an already selected session context.
- Rotate a presented sign-in session as before. A valid presented session may retain only its own same-account live ordinary assignment. A foreign account, another account of the same person, revoked/expired session or assignment, and emergency scope cannot supply a preferred assignment. A new device uses the existing deterministic ordinary-workspace default.
- Align the existing own-workspace-switch policy with the application's actual role aliases. Ownership, liveness, scope, CSRF, rate limiting and audit remain server-enforced; this grants no business action or new role.
- Unknown, expired or absent authority opens explicit recovery. Emergency context retains its warning on the chooser and never becomes an ordinary administrator default. A service failure does not claim the user signed out or change their active workspace.
- Role destinations correspond to existing authorized navigation. Demo setup/publication links require their existing source-owner permission responses and exact fictional scope. All destination APIs remain authoritative.
- Preserve grants, account switching, expiry warnings, security actions and break-glass warnings on the explicit chooser. Staff home links use the same resolver; deliberate switch links use `/workspaces`.

No student CSS/pages, new role authority, schema preference store, provider, production activation, database reset, commit or push is authorized by this packet. Student presentation is separately owned by UI-011.

## Verification and explanation

Focused resolver/return-target tests cover student, applicant, lecturer, SYSADMIN, selected multi-role, missing/expired/emergency authority, exact demo scope and return-link rejection. Connected API/browser proof covers real sign-in, role switching, cookie rotation, same-account retention, foreign/same-person/expired denial, safe no-active recovery and preserved explicit destinations. Existing browser sign-in expectations move from `/` to each known fixture's actual landing. Root coordinates complete checks and browser verification. Record actual evidence in the [decision and learning note](../learning/NOTE-V2-UI-012.md); no human acceptance is inferred.
