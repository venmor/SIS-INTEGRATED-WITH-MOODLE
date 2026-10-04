# Release execution and acceptance

Execute the [detailed plan](../../plan/feature-sis-expansion-2.0.md) by dependency, not by creating all modules at once. New slices start from a reviewed task packet with exact evidence, lead/reviewer and exclusions. Charles and Chitundu rotate responsibility; existing Phase7 lead is Chitundu Milimbo and reviewer Charles Hangoma, without implied signoff.

| Gate | Required evidence | Blocker treatment |
|---|---|---|
| Before coding | Full linked exact evidence; later decisions; role/state/owner/policy and UI/recovery contract | Record gap; disable dependent action; continue independent work |
| Before slice acceptance | Working UI/API/data/audit path; allow/deny/time/scope/concurrency/rollback/unknown-outcome tests; migration and browser proof | Fix failures; distinguish external/human evidence still pending |
| Before release candidate | Integrated baseline; all MVP regressions; source/security scans; role UAT; current maturity and gap register | No green parent release hiding an incomplete required journey |
| Before operational release | Provider agreements, monitoring/support, restore/reconciliation, rollback, load/accessibility, policy and named owner acceptance | Remain demo/pilot with explicit limits |
| Before merge/tag/push/deploy | Reviewable final diff and recorded user authorization | No action inferred from this plan |

Critical path: reviewed OpenCode integration → actual publication policy/step-up → connected MVP hardening/rehearsal → academic offering/rule foundation → timetable/examination and finance/support → governance/research completion/credentials → certified reporting → provider/migration drills → v2.0 acceptance.

Parallel work is safe only with separate owned files/contracts and declared dependencies: timetable resources can proceed alongside academic-credit cases after TASK-011; anonymous SET completion must precede exam-slip integration; provider sandbox work can proceed before activation; student AI knowledge search can precede approved model use. Approval, migration and shared-contract edits stay coordinated.

Dates/estimates are set only after each task's authority and integration gates close. Completion means documented evidence and human review, not an agent's estimate.
