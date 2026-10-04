# Technical debt and integration obligations

| Priority | Finding | Concrete resolution |
|---|---|---|
| Release blocker | Primary main `b9fa96d` and assessment baseline `9ffed61` diverge; OpenCode committed its fixes separately | TASK-001 integration diff, migration comparison and clean combined regression; no overwrite |
| Release blocker | Release policy and step-up providers default to deny | TASK-002/003; connect reviewed services and full browser re-authentication; no DEMO_MODE bypass |
| High | Legacy role labels coexist (`STU` seed versus `STUDENT` conversion) | Results now follows conversion's STUDENT/study gate. TASK-003 documents/migrates aliases across modules rather than widening authority ad hoc |
| High | Course offerings and school scope are partly free strings | TASK-011 authoritative registry, reconciliation/backfill, scoped API tests and preserved history |
| High | Notification outbox record is not delivery/recovery evidence | Integrate reviewed worker with per-destination attempts and incident owner; exercise failure/replay and neutral content |
| High | Amendment impact rows lack owner-domain consumers | TASK-014/034/061/071; source-versioned idempotent acknowledgements and visible pending review |
| Medium | Two GAP-021 filenames and historical review text can mislead status | Preserve original records; add unambiguous index/status cross-links before release |
| Medium | Some assessment numeric rules/queue deadlines are fictional interim constants | GAP-022 approval/configuration work; known-answer boundary tests; never claim production authority |
| Medium | Publication workspace currently scopes amendment IDs by loading scoped release IDs | Migrate to explicit relational scoped pagination when volume warrants; keep direct authorized detail and >100-record coverage |
| Medium | Existing lint warns about unsafe optional chaining in registration.service.ts | Review with owner/OpenCode integration; not modified opportunistically in this worktree |
| Operational | Missing current complete restore/rollback/load/screen-reader/WSL evidence | TASK-005/006 and v2.0 drills; record actual commands/artifacts, never invent acceptance |

The continuation migration is unreleased and was corrected during isolated tests. Do not edit an already-applied institutional migration during integration: reconcile migration history explicitly and use a follow-up migration where necessary.
