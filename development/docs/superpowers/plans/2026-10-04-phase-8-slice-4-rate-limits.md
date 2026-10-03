# Phase 8 Slice 4 Rate-Limit/Abuse Tuning Implementation Plan

> Executed inline 2026-10-04 (lead Chitundu Milimbo, reviewer
> Charles Hangoma) under `TASK-PH8-004`. This file records the
> approved plan all tasks completed against.

**Goal:** Every handbook rate-limit baseline row (07/04
§Rate-limit baseline; compendium §19.41) reconciled to code +
test, with demo-only values and gaps filed where the handbook
does not map.

**Architecture:** Existing in-memory sliding-window
`RateLimiter` retained (locked stack forbids Redis); new
`UploadQuotaGuard` on the upload route counting existing
`ApplicationDocument` rows per Lusaka calendar day (no
migration); FIN callback budget moved from hard-coded
controller literals into versioned config (numbers unchanged).

**Tech Stack:** NestJS + TypeScript, Prisma + PostgreSQL 18,
Vitest e2e, Node 22.13.1 (full demo seed needs Node 24 —
full-seed suites are GAP-024 follow-ups).

**Spec:** `development/docs/task-packets/TASK-PH8-004.md`.

## Global Constraints

- Locked stack; no Tailwind/microservices/Redis/Kafka/K8s.
- Server-side authz; denials 429 + `Retry-After` (+ audited
  DENY on the sensitive-route precedent); neutral shapes.
- Demo data/values only (SUP-009). No 429→`OpsIncident`
  auto-creation (self-DoS amplification — deliberate
  exclusion). Trust-proxy default unchanged (deployment gap).

---

### Task 0: Packet — [x] `TASK-PH8-004.md` drafted 2026-10-04 (human approval pending)

### Task 1: Reconciliation matrix — [x]
Login, recovery, search, ordinary API, high-impact, callbacks:
code + tests confirmed. Submission per-IP row → GAP-023
(authenticated flow; no anonymous submission to key per IP).
Daily quota row → Task 2 (handbook-authorized).

### Task 2: Daily upload quota — [x]
- Config `upload.maxUploadsPerDay: 10` (packet-local demo).
- `upload-quota.ts` (Lusaka day math) + `upload-quota.spec.ts`.
- `UploadQuotaGuard` (429 + `Retry-After` + audited DENY) on
  `POST :id/documents`; wired in `AdmissionsModule`.
- `upload-quota.e2e-spec.ts` 4/4 RED-first on a fresh DB.

### Task 3: Budget tuning — [x]
No legit-flow 429 on runnable suites; general 180/min and
initiation 3/min unchanged (no measured evidence to move
them). Grade-board workaround + full-seed reruns → GAP-024.

### Task 4: Abuse hardening — [x]
Verified by inspection: auth/workspace/commands/grants/
catalogue return 429 + `Retry-After` + audited-DENY, neutral
shapes. Non-changes recorded: finance-initiation DENY audit
(GAP-024), trust-proxy widening (GAP-024).

### Task 5: Load proof — [x]
Unit window-expiry/recovery, quota burst-to-deny e2e,
bucket-map bound; `auth` 10/10 rerun; unit 78/78.

### Task 6: Closeout — [x]
`NOTE-PH8-004`, Phase 8 review row, `VERIFICATION.md`
slice-4 section, packet completion, DESIGN-INDEX line,
GAP-023/024.

## Self-Review

**1. Spec coverage:** packet outcome (reconcile + quota +
tuning + neutrality + load proof) → Tasks 1–6. Interim
decisions (429→incident exclusion, API-only proof, in-memory
limiter, trust-proxy) all recorded in the packet.
**2. Placeholder scan:** no TBD/TODO.
**3. Proof honesty:** full-seed suites named as follow-ups,
not claimed.
