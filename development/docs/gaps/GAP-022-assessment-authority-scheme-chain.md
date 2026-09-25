# GAP-022: assessment authority, demo scheme, and canonical chain (Phase 7 slices 1–3)

- Date: 2026-09-24. Phase: 7 slices 1–3 (TASK-PH7-001..003).
- Note: GAP-021 exists twice (`GAP-021-real-timetable-validation.md`
  and `GAP-021-tg-timetable-conflict.md`). Rename one before release;
  this record takes the next free number GAP-022.

## Missing or contradictory design

1. Canonical chain collision: catalogue gives ACT-ASM-001 (Stage
   marks); traceability example gives ACT-MOD-GRD-003 / SCR-MOD-GRADE-002
   / CMD-StageMoodleGradeTransfer / TEST-INT-MOODLE-031 etc. Example
   IDs appear nowhere else and are not implementable pass criteria.
2. No approved assessment values: DEMO-ACADEMIC-2026-v1 carries only
   CA 40 / exam 60 / pass 50. Scales, boundaries, components,
   rounding, moderation/release thresholds are absent; readiness gate
   demands confirmed demo assessment authority (unconfirmed).
3. No assessment role/capability/scope in code: schema has no Role
   enum (free strings); seed has LEC (`teach`, `stage-marks`,
   unenforced) + expired TUT only. No COORDINATOR, EXAMINATIONS_OFFICER
   or MOODLE_ADMIN account; handbook labels (§15.6) are natural
   language, and Design Sec 2 uses dot-style (`assessment.mark.submit`)
   vs hyphen slugs elsewhere.
4. Queue swimlanes + provisional visibility + escalation deadlines are
   stated across sources but never assigned to one owner or value.

## Interim decision (demo only, fail-closed until approved)

- Chain: ACT-ASM-001 + CMD-LRN-StageMoodleGradeTransfer +
  INT-Moodle-GradeTransfer-v1 + EVT-MoodleGradeTransferStaged-v1.
- Scheme `ASSESSMENT-DEMO-v1` (fictional, SUP-009): CA-QUIZ1 max 20
  w20, CA-ASSIGN max 30 w20, FINAL-EXAM max 100 w60, pass 50, scale
  0–100, rounding half-up 2dp, moderation route coordinator→
  examinations, provisional hidden from students, 11 non-numeric
  outcome codes per DS5 §3.
- Authority: LEC + stage-marks (OFFERING scope, now enforced);
  COORDINATOR + approve-assessment (SCHOOL scope, new demo account);
  EXAMINATIONS_OFFICER + validate-results (PERIOD scope, new demo
  account); MOODLE_ADMIN technical mapping only (reuse Phase 6 demo
  login); SYSADMIN denied on all assessment writes. Four-eyes on plan
  approval + mapping activation (UI-DECISION-001 page).
- Swimlanes: technical mapping errors → Moodle Admin; academic
  findings → lecturer/coordinator; enrolment truth → Registry;
  examinations operates, never invents marks.

## Stop rule applied

Deny-by-default on unmapped/out-of-range/missing batches; never
auto-overwrite official CA; MISSING_MARKS preserved + audited; no
hard-coded policy values outside versioned config. This gap blocks any
claim of complete §15.6/DS5 compliance or production assessment
authority.

## Slice 3 demo queue values (2026-09-25, fictional, SUP-009)

- Missing-mark escalation deadline: 7 days from validation
  (`ESCALATION_DAYS` in the assessment service; Africa/Lusaka
  wall-clock via ISO timestamps).
- Work-item owners: academic findings → the batch offering reference;
  enrolment truth → `REGISTRY`; technical errors → `MOODLE_ADMIN`.
- No Registry demo role exists, so enrolment-truth findings surface in
  the operating examinations-officer lane labelled `REGISTRY`. A
  Registry role/capability/scope needs institutional approval before
  the lane can be separated.
- Validation is synchronous (no worker): pause/resume and retry
  budgets do not apply; replay is the idempotency-key replay of
  validate/transition, which converges instead of duplicating. No
  notifications are sent, so notification-failure recovery is
  not applicable to this slice.

## Resolve by

Institution approves (or amends) the interim chain, scheme values,
roles/capabilities/scopes, swimlanes, visibility, and deadlines;
seed + SECURITY_V1 + gates updated to match; example-only IDs retired
from traceability references.
