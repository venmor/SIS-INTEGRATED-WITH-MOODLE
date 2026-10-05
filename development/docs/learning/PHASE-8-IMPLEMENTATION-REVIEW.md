# Phase 8 Implementation Review — Hardening, Operations and Evidence (slices 1–7)

Release v0.9.0 track. Roadmap
`11-…/10-phase-8-hardening-operations-and-evidence.md` slices 1–5
(TASK-PH8-001 approved 2026-10-03 for slice 1; TASK-PH8-002 approved
2026-10-03 for slice 2; TASK-PH8-003 approved 2026-10-03 for slice
3; TASK-PH8-004 drafted 2026-10-04 for slice 4, human approval
pending; TASK-PH8-005 drafted 2026-10-04 for slice 5, human approval
pending; TASK-PH8-006 drafted 2026-10-04 for slice 6, human approval
pending; TASK-PH8-007 drafted 2026-10-04 for slice 7, human approval
pending). Simulator-only (`SIM-NOTIFY-v1` provider);
`NOTIFY-DEMO-v1` is fictional (SUP-009, GAP-008). Lead Chitundu
Milimbo (slices 3–4); reviewer Charles Hangoma.

## Slice map (requirement → code → test)

| Slice | Requirements | Code | Tests |
|---|---|---|---|
| 1 notification record + delivery | §§16.11–16.14; UX §12.13; applicant §9; student §8; quality §11.39; §§15.6–15.7,15.19; TEST-REC-005/010 shapes | versioned templates, records + per-channel deliveries, worker + SIM provider, retry/dead-letter/escalation, staff-signal projection, assessment fan-out; centre + signals pages + proxy | `notifications` 16/16 |
| 2 cross-domain audit timeline | §16.14; §15.19; UI-TIMELINE-001; visibleTimeline/caseHistory contracts; TEST-E2E shapes | kind-dispatched entity endpoint, gate-first joins, audited reads; package History section + contracts | `audit-entity-timeline` 10/10 |
| 3 ops health + incident queue | §16.13; §§16.5,16.7,16.10; §§15.6–15.7,15.19; incident-lifecycle + worker-recovery clauses; TEST-REC shapes | generic `OpsIncident` (partial-unique one-OPEN-per-source) + dead-letter auto-open hooks in both domain workers + console (`/admin/ops`) over existing integration ops | `ops-incidents` 15/15 |
| 4 rate-limit/abuse tuning | §19.41 (compendium lines 28153–28172); §§15.6–15.7; TEST-REC shapes | per-user Lusaka-day upload quota (`UploadQuotaGuard`, 429 + Retry-After + audited DENY) + versioned FIN callback budget + GAP-023/024 | `upload-quota` 4/4 |
| 5 accessibility/performance/low-bandwidth | journey §10; §17.6; acceptance catalogue; a11y/low-bandwidth test doc | axe scans (4 journeys) + unified `#main-content` landmarks + `RouteFocus` + label sweep + zoom/reflow + slow-connection + token contrast A5/A6 + manual checklist | `accessibility` 10/10 |
| 6 backup/restore rehearsal | backup-and-recovery §; TEST-REC-008; §12.14 | `backup:test` widened to all 103 models + domain orphan checks + document hash check + full drills | script unit green + 3 drills green |
| 7 demo reset and evidence capture | exit gate; TEST-REC-007/008 | fail-closed `demo:reset` (isolated project only) + CI backup step + release/rollback refs + walkthrough | refusals + rehearsal green |

Total: 45/45 API e2e on fresh isolated DBs (16 + 10 + 15 + 4); unit 78/78; browser
notification centre + package history + ops queue journeys 1/1 each at 390px with
keyboard, focus, no overflow, empty localStorage; accessibility suite 10/10
(axe, focus, labels, zoom, slow connection) plus contrast script 11/11.

## Authority notes

- Exact records read per packet (compendium §§12.13, applicant §9,
  student §8, quality §11.39, §§16.11–16.14). Later decisions and
  security rules over evidence; SUP-001–SUP-013 respected.
- In-system delivery is real; email/SMS dispatch is simulated with
  neutral previews only. Mandatory notices cannot be suppressed.
  Delivery failure never mutates workflow state.
- Audit + notification written in the same transaction on fan-out
  paths (compendium line 9717).

## Demo checkpoint (roadmap slice 1)

Template → record → worker delivery → inbox read receipt; armed
failure → retries → dead-letter → staff escalation; mandatory
notice survives suppression; assessment release fans out
per-student RESULT notices.

## Remaining gates

All four slices implemented (human review pending for each);
`backup:test` script still predates Phase 3–8 tables (manual
drills cover them — follow-up to widen the script); no slice-4
migration exists (quota counts existing rows; config is code).
Manual screen-reader/WSL replay, remote CI, Vercel route check,
production provider + policy approval, Phase 6 full-seed
regression on a Node 24 box (min-seed insufficient for the
applicant→student journey; reproduced on clean HEAD, not a
slice-3 regression), human walkthrough (both developers must
explain the slice). Detail: [NOTE-PH8-001](NOTE-PH8-001.md),
[NOTE-PH8-002](NOTE-PH8-002.md), [NOTE-PH8-003](NOTE-PH8-003.md),
[NOTE-PH8-004](NOTE-PH8-004.md), [NOTE-PH8-005](NOTE-PH8-005.md),
[NOTE-PH8-006](NOTE-PH8-006.md), [NOTE-PH8-007](NOTE-PH8-007.md),
[VERIFICATION](VERIFICATION.md) Phase 8 slices 1–7.
