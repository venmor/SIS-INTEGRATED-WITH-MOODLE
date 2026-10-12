# Governed synthetic university setup implementation plan

Spec: `development/docs/superpowers/specs/2026-10-02-v2-operating-sis-design.md`; scoped contract: `development/docs/task-packets/TASK-V2-SETUP-003.md`. Implements the next increment of operating-plan Tasks 2/4. The user's 2026-10-07 instruction resumes cloud Moodle assessment; simulator remains active until persisted run/manifest authority, reviewed mappings and durable claim/delivery controls are implemented. A confirmed identity or a token alone cannot open live writes.

## Global constraints

Existing review worktree only; synthetic data; no paid providers or new dependencies. Explicit fictional authority and isolation, current appointment checks, independent person approval, immutable versions, atomic projection/audit/outbox. Do not rewrite official histories or claim production signoff.

## Task 1: Typed configurable structure/calendar validation

- [x] Add shared request/response contracts and parser tests for references, configurable kinds, duplicate codes, cycles, ordered/contained dates, unsupported fields and canonical digest.
- [x] Run `npm run test --workspace=api -- demo-setup-policy`; new behavior was observed red, then passed after the domain parser. Original-row correction metadata is covered by 51 parser cases.
- [x] Add editable fictional starting profile in the owned configuration module, never auto-activate it.

Produces: typed canonical profile and validation errors. Consumed by API save/activation and web editor.

## Task 2: Immutable drafts and independent atomic activation

- [x] Write connected API tests before routes for active appointment, gate, same-person denial, immutable source projections, retries/stale/concurrent command and unchanged legacy windows.
- [x] Run focused e2e on isolated PostgreSQL; absent routes were observed red, then 10 connected cases passed, including rollback and authority expiry.
- [x] Add additive migration, owned service/controller, audit and durable event, source revalidation and serial activation lock. No cross-owner academic transactions.

Produces: `/institution-setup/demo-university` list/save, `/.../:id/activate` command and explicit installed-version projections. Consumed by UI and later owner reconciliation.

## Task 3: Real operator UI and synthetic rehearsal

- [x] Add allowlisted same-origin proxy, guided editor, saved-version review/compare and separate approver action. Preserve input/reference on uncertain outcome.
- [x] Add isolated demo accounts and navigation only under explicit opt-in. No privilege inheritance from SYSADMIN.
- [x] Build API/web, run focused browser and project tests; inspect mobile/keyboard/error states. Four connected browser stories passed. Exact results, handoffs, broader fixture correction and remaining gates are in [verification](../../learning/VERIFICATION.md) and [SETUP-003 learning](../../learning/NOTE-V2-SETUP-003.md).

## Review focus

Same person with two accounts; revoked appointment while approving; stale current activation; reordered same-key profile; missing/repurposed stable codes; cyclic graph or invalid period parent; concurrent approvals; failed projection after version creation; hidden draft access; fake MFA claims; mixing source versions; legacy registration-window mutation; live-gate bypass; UI loss of form values or command reference on failure.
