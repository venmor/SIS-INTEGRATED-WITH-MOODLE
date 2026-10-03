# Phase 8 Implementation Review — Hardening, Operations and Evidence (slices 1–3)

Release v0.9.0 track. Roadmap
`11-…/10-phase-8-hardening-operations-and-evidence.md` slices 1–3
(TASK-PH8-001 approved 2026-10-03 for slice 1; TASK-PH8-002 approved
2026-10-03 for slice 2; slice 3 planned, packet pending). Simulator-only (`SIM-NOTIFY-v1` provider);
`NOTIFY-DEMO-v1` is fictional (SUP-009, GAP-008). Team: unassigned
(assign at kickoff).

## Slice map (requirement → code → test)

| Slice | Requirements | Code | Tests |
|---|---|---|---|
| 1 notification record + delivery | §§16.11–16.14; UX §12.13; applicant §9; student §8; quality §11.39; §§15.6–15.7,15.19; TEST-REC-005/010 shapes | versioned templates, records + per-channel deliveries, worker + SIM provider, retry/dead-letter/escalation, staff-signal projection, assessment fan-out; centre + signals pages + proxy | `notifications` 16/16 |
| 2 cross-domain audit timeline | §16.14; §15.19; UI-TIMELINE-001; visibleTimeline/caseHistory contracts; TEST-E2E shapes | kind-dispatched entity endpoint, gate-first joins, audited reads; package History section + contracts | `audit-entity-timeline` 10/10 |
| 3 ops health + incident queue | §16.13; §§16.5,16.7; TEST-REC shapes | _planned_ — generic OpsIncident + console over existing integration ops | — |

Total: 26/26 API e2e on fresh isolated DBs (16 + 10); unit 73/73; browser
notification centre + package history journeys 1/1 each at 390px with
keyboard, focus, no overflow, empty localStorage.

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

Slices 2–3 unimplemented (packets pending); `backup:test` script
still predates Phase 3–8 tables (manual drill covers them —
follow-up to widen the script); manual screen-reader/WSL replay,
remote CI, Vercel route check, production provider + policy
approval, human walkthrough (both developers must explain the
slice). Detail: [NOTE-PH8-001](NOTE-PH8-001.md),
[VERIFICATION](VERIFICATION.md) Phase 8 slice 1.
