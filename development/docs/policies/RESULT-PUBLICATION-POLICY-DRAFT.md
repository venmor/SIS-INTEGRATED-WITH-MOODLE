# Official course-result publication policy — decision draft

**Status:** proposed on 2026-10-01; no institutional approval or release authority is inferred. This records the policy the team must settle to finish Phase 7. The handbook's approved result and privacy boundaries remain controlling; this draft cannot supersede them. Implementation gap: [GAP-022](../gaps/GAP-022-assessment-authority-scheme-chain.md) and [Phase 7 continuation](../gaps/GAP-PH7-CONTINUATION.md).

## Binding rules from approved design

1. SIS accepts marks once from Moodle into a validated staging route; Moodle cannot overwrite moderated, board-approved or published results. A calculated result is never automatically official.
2. A complete course/period result set needs reproducible component and policy snapshots, resolved candidate identities, authoritative course registrations, completed validation and moderation, and the configured board or examinations approval. Missing, deferred, withheld and misconduct-pending outcomes remain distinct from numeric zero.
3. Only a live, period-scoped examinations assignment with `release-results` may publish. The publisher must be independent of preparation/marking. A fresh, single-use MFA proof must bind the active session, action, package or amendment version and exact command. Publication writes an immutable full-batch version, audit and safe notices atomically; delivery failures cannot undo the official record.
4. A student sees only their own published results and approved review route. Unpublished marks, internal board notes, protected incidents and another student's data are excluded. Corrections create a linked new official version and review tasks for affected downstream domains.

Sources: exact approved Design Section 5 §§1–4, 7, 10–19; Design Section 10 §§11–13 and 19–25; lecturer/tutor and student role blueprints; Phase 7 roadmap slices 6–7; permission/visibility, recovery and UI evidence cited in [TASK-PH7-006/007](../task-packets/TASK-PH7-006-007.md).

## Decisions requiring institutional owner and signoff

| Decision | Proposed recording rule | Owner to name before activation |
|---|---|---|
| Effective scope and version | One immutable policy version per course offering and academic period, with effective date and supersession reference | Academic Registry / examinations policy owner |
| Approval chain and quorum | Record the authorized board or committee, meeting/evidence reference, recommendation, final approver and delegated release officer; do not infer a quorum or shortcut from a role label | Academic governance |
| Publication window and holds | Record exact Africa/Lusaka release time, academic/administrative restrictions, authorized exception process, and the owner of every resolved restriction | Examinations and Registry, with relevant policy owners |
| Student visibility | Decide marks versus outcome-only display, withheld explanation, supplementary/repeat wording, review/appeal instructions and approved deadlines; no provisional display by default | Academic governance and student services |
| Course and period mapping | Version the authoritative offering-to-course and period mapping; Moodle shell names are not authority | Registry and examinations |
| Amendment and notice | Define who may request and independently approve a replacement; preserve both versions, the reason/evidence, impact tasks and affected-student notice route | Examinations, Registry and downstream owners |
| Operational signoff | Record approver names, decision date, review evidence, provider/notification rehearsal and rollback procedure | Named institutional release authority |

Until these values are approved and represented by a versioned provider, the default publication policy resolves to `null` and the API refuses release. The current IAM challenge is account/action-bound, so it does **not** satisfy the stronger publication proof contract. Policy approval alone will not open the release endpoint.

## Isolated fictional demonstration policy

`RESULT-PUBLICATION-DEMO-v1` is an executable **fictional** profile for synthetic course codes beginning `RESULT-DEMO-` in period `DEMO-2026S1`. It is off unless `DEMO_MODE=true`, `SIS_ENABLE_RESULT_DEMO_POLICY=true`, the database hostname is loopback, and its name contains `test`, `review` or `ci`. It never selects an institutional course or a remote database. The course code must exactly match the assessment offering reference and the period must exist. The fictional release instant is 2026-01-01 00:00 Africa/Lusaka; the student may see their published numeric mark and outcome, with the instruction “For this fictional result, contact the demo examinations office to request a review.” Fictional fixtures contain no holds or incidents; any unresolved or exceptional candidate result remains blocked by the publication service. No actual appeal deadline, faculty appointment, Senate quorum or production restriction is claimed.

This profile provides policy test data only. A real browser release still requires the separately bound and transactionally consumed MFA proof, an explicitly granted demo examinations publisher, and a complete synthetic Moodle-to-board result fixture. Never set these flags on an institutional database or treat a passing demo as policy signoff.
