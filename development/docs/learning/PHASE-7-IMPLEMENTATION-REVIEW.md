# Phase 7 Implementation Review — Assessment and Official Results (slices 1–2)

Release v0.8.0 track. Roadmap
`11-…/09-phase-7-assessment-and-official-results.md` slices 1–2
implemented in `development/` on local `main` (uncommitted; human
review pending). Simulator-only (`MOODLE-SIM-v1` provenance);
`ASSESSMENT-DEMO-v1` is fictional (SUP-009, GAP-022). Slices 3–7
(validation queue, moderation, board, release, amendment) are not
started — no queue, moderation, board, release, or amendment code
exists. Team (user correction 2026-09-25): Chitundu Milimbo leads the
Phase 7 slices; Charles Hangoma reviews.

## Slice map (requirement → code → test)

| Slice | Requirements | Code | Tests |
|---|---|---|---|
| 1 scheme + mapping plan | REQ-ASM-001/002; REQ-LRN-001; DS5 §§1–2,14; Lecturer/Tutor I §6.4 + II §§1–5; §§15.6–15.7; UI-DECISION-001; SCR-REC-LEC-001 | `assessment` plans/mappings, four-eyes, closed scheme; plans/mappings/decide pages + proxy | `assessment-plan` 20/20 |
| 2 staging snapshot | REQ-LRN-004/005; REQ-OPS-004; ACT-ASM-001; DS5 §4; Lecturer/Tutor II §§6–7; Journey C steps 2–3; INT-MDL-001; SCR-REC-LEC-001 + SCR-OPS-LRN-001 | frozen provenance, outage guard, chained outbox; batches pages + detail | `grade-staging` 18/18 |

Total: 38/38 API e2e on fresh isolated DBs; slice-1 regression held
20/20 after slice 2; unit 73/73; browser plan→map→activate→stage
journey (with provenance assertions) 1/1 at 390px with keyboard,
focus, no overflow, empty localStorage.

## Authority notes

- Exact records read per packet (DS5, Lecturer/Tutor I §6.4 + II
  §§6–8, Journey C, ACT-ASM-001, INT-MDL-001, command/event contracts,
  §§15.6–15.7, UI catalogue). Later decisions and security rules over
  evidence; SUP-001–SUP-013 respected.
- Canonical chain recorded in every staging outbox payload:
  ACT-ASM-001 + CMD-LRN-StageMoodleGradeTransfer +
  INT-Moodle-GradeTransfer-v1 + EVT-MoodleGradeTransferStaged-v1.
  Decision (2026-09-25): the stored outbox `type` stays the short
  implementation reference `MoodleGradeTransferStaged` (endpoint/test
  names are implementation references per DESIGN-INDEX); the exact
  handbook IDs travel in `payload.chain`. Revisit only if a consumer
  needs the full EVT name as the type.
- Demo arithmetic holds: CA-QUIZ1 w20 + CA-ASSIGN w20 = CA 40,
  FINAL-EXAM w60, pass 50, scale 0–100; DS5 §3 eleven outcome codes
  exact; a numeric zero is genuinely zero, never absence.
- Enrolment-truth disputes are staging-excluded by design: lines
  record the resolved SIS identity; Registry swimlane resolution is
  slice 3. Batches stop at VALIDATED; MAPPED and later transitions
  belong to slices 3+.
- Seed now covers the demo cast: `chisenga.l` (LEC, SWE-2026S1,
  added slice-2 closeout — `mutinta.l` predates Phase 7 and stays on
  SWE101-2026S1), `chisela.k` (COORDINATOR), `kaluba.e`
  (EXAMINATIONS_OFFICER), `mumba.s` (MOODLE_ADMIN, technical only).

## Demo checkpoint (roadmap slices 1–2)

Draft scheme → second-officer approval → draft/test/activate mapping
→ stage batch with quarantine flags → frozen provenance on the batch
detail page. Moodle alone publishes nothing (no release path exists).

## Remaining gates

Slices 3–7 unimplemented; `backup:test`, manual screen-reader/WSL
replay, remote CI, Vercel route check, production policy approval,
human walkthrough (both developers must explain every slice). Detail:
[NOTE-PH7-001](NOTE-PH7-001.md), [NOTE-PH7-002](NOTE-PH7-002.md),
[VERIFICATION](VERIFICATION.md) Phase 7 slices 1–2.
