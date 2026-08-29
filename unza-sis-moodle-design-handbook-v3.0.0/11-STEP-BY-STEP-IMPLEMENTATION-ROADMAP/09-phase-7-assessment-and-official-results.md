# Step 8 — Phase 7: Assessment and Official Results

**Release target:** v0.8.0

## User/system outcome

Provisional Moodle marks are staged, validated and approved through a controlled examinations workflow before official SIS release.

## Read before planning

- Design Section 5
- Lecturer/Tutor and Administrative Operations journeys
- Moodle grade boundary
- Permission and test catalogues

## Learning goals

- Snapshots and validation
- Approval workflow and separation of duties
- Versioned result amendment
- State-dependent UI

## Ordered delivery slices

1. Assessment/mapping plan
2. Moodle grade staging snapshot
3. Validation/missing-mark queue
4. Lecturer correction and moderation handoff
5. Board/decision package
6. Official result release and student view
7. Amendment skeleton

## Security, integrity and recovery focus

- Lecturer assignment scope
- Examinations/board authority
- No system-admin result edit
- Release idempotency
- Sensitive export control

## Required proof

- Unmapped/duplicate/out-of-range/missing mark
- Unauthorized tutor/examinations/admin action
- Concurrent release/duplicate click
- Notification failure after release
- Amendment updates dependent progression readiness

## Team rotation and documentation

One developer leads teaching/staging; the other leads examination approval/release. Peer review focuses on ownership boundary and denial tests.

## Demonstration checkpoint

Stage provisional marks, detect an invalid value, correct through the owner, approve and release; show that Moodle alone cannot publish.

## Exit gate

- Provisional/official distinction visible in data and UI
- Every result version traceable
- Release authority tested
- Student sees only published outcome
