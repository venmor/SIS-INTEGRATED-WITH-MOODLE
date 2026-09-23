# Learning Note — TASK-PH5-006 (reconciliation queue and governance)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH5-006)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-23 / v0.6.0 track Phase 5 slice 6
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

The finance workspace: reconciliation queue (SCR-REC-FIN-001 case pages
with evidence, allocation, callback history and authorized actions —
match at evidence amount, mark duplicate, escalate; originals never
edited), versioned sponsorship recording/confirmation (expiry
recalculates), maker/checker adjustments/waivers/refunds (thresholds +
evidence rules + payout references; compensating credit lines, never
edits), student arrangement requests with approver decisions
(time-boxed clearance entitlement), and cashier intake → confirm for
reported offline payments. Expired-request callbacks become UNCERTAIN
review work, never money.

## Frontend

- `/admin/finance` home (prioritized counts), `/cases` queue,
  `/cases/[id]` (evidence + callbacks + allocations + resolve),
  `/sponsorships`, `/adjustments` (request + decide),
  `/arrangements` (queue + decide), `/cashier` (intake + confirm);
  student `/finance/arrange` request page; sign-in demo panel gains the
  finance pair; `/api/finance` proxy extended (reads + writes allowlist).

## Backend/domain

- `listCases/caseDetail/resolveCase`, `record/confirm/update/
  listSponsorships`, `request/decideAdjustment`, `request/list/decide
  Arrangement`, `record/confirmCashIntake`; expired-callback branch;
  arrangement hook + sponsorship date bounds in the calculator.

## Database/migration

- `20260925130000_ph5_governance`: `FinanceAdjustment`,
  `FinanceArrangement`.

## Security + authz

- Finance scope + capability + SoD server-side (dual-hat same-account
  refusal tested); cashier cannot approve; students caller-bound with
  safe wording; no toggle endpoint; step-up auth absent → GAP-020
  (blocks production claims, demo labelled).

## Tests and what they prove

- `finance-governance.e2e-spec.ts` (20 tests): sponsorship
  confirm/version/expiry/denials, credit posting, SoD (role split +
  dual-hat), evidence threshold, refund payout + maker/checker, decline
  reasons, arrangement grant/decline/denials, cashier match/mismatch,
  queue visibility, match/duplicate/escalate with history, resolution
  denials, expired-callback case, queue denials. 68/68 with all finance
  specs on a fresh DB; 53/53 Phase-4 registration specs unaffected.
- Browser: workspace queue → escalate → sponsorship record; portal
  reversal checkpoint (HELD after reversal). Green.

## What failed or confused us

- No step-up ceremony exists → GAP-020 instead of invention.
- Proxy write-regex used `${uuid}` inside a literal (never
  interpolates); converted to `new RegExp`.
- Assessment threw when no invoice exists (sponsorship on a
  chargeless account); returns NOT_ASSESSED.
- `${uuid}`-style copy errors and relative CSS paths on new admin
  pages; fixed by build errors.
- Dirty-DB duplicates in browser lists; scoped assertions.

## Questions to revise

- Case decision tree; maker/checker matrix; why clearance needs no
  manual switch; what GAP-020 leaves open.
