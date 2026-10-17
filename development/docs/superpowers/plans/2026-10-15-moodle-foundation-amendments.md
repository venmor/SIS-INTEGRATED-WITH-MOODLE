# Moodle foundation execution amendments — 2026-10-15

Authority: approved 2026-09-25 design and 2026-09-27 plan; user's 15 October major synthetic continuation and fictional-policy authorisation. Lead Charles Hangoma, reviewer Chitindu Milimbo. This is application-local execution clarification; original approval text remains intact.

1. Independent consent replaces caller-supplied secondApproverAccountId. Each actor submits their own password-verified, single-use, session/assignment/run/action/evidence-bound receipt. The start command revalidates the technical approval's original session/assignment and freshness as well as the operational actor. A timestamp update alone is never password proof. Synthetic password reauthentication is not institutional MFA approval.
2. COMPLETED and FAILED forbid return to RUNNING but permit the explicitly specified CLOSED transition. CLOSED admits no action. PREPARED may be abandoned through the operational fail command with reason, preserving evidence and releasing the one-active-run constraint.
3. Manifest entries reject UPDATE/DELETE and also INSERT after sealing. The manifest checksum/seal cannot be rewritten. A new run is required for a changed sealed scope.
4. Preparation validates every target field without claiming runtime run binding, computes its actual database/migration fingerprint and returns nonsecret requiredBinding. The operator supplies that binding through the existing environment procedure; start/resume independently require ordinary configuration to match. No fake configuration or identity result permits RUNNING.
5. A current-timestamp additive migration replaces the old plan's backdated filename. The shared fresh-authentication receipt model is owned in the same coordinated migration. No parallel schema generation occurs before coordination.
6. RUNNING records foundation approval only; the existing source/claim deferral remains in force until later mapping/delivery plans pass. The complete command refuses with FULL_REHEARSAL_EVIDENCE_REQUIRED in this foundation; it never creates a false acceptance record. Failed/abandoned foundation runs can close only after independent credential-retirement and frozen-evidence declarations.

Verification and rulings are recorded in NOTE-V2-MOODLE-002. All work stays in the existing isolated worktree; plan commit steps are superseded by the root's release ownership.
