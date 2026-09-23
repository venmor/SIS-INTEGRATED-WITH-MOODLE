# TASK-PH5-005: Allocation, balance and clearance calculation

## Authority and ownership

User authorization: Phase 5 all-slices implementation request, 2026-09-23. Release v0.6.0 track. Proposed lead Charles Hangoma (ledger logic); reviewer Chitindu Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap Phase 5 slice 5; Design Sec 6 §§14,17–18 (immutable subledger; balance reproducible from posted transactions; clearance NOT_EVALUATED→PENDING→CLEARED|HELD|MANUAL_REVIEW with policy inputs; verified payment triggers recalculation; gateway cannot register); Finance Blueprint authoritative model (balance calculated from subledger; clearance is versioned policy result, not manual switch; provider cannot grant clearance) + Journey A steps 5–7 (allocate per approved rules; recalculate under controlling policy version; receipt/timeline independent of SMS/email); student journey Part 2 §§2,6–7 (clearance status model; arrangement lifecycle; hold scopes/resolution; temporary clearance explicit+auditable); REQ-FIN-004/006/007; ACT-REG-001 finance-state check; TEST-E2E-REG-002 + TEST-E2E-FIN-006 (partial pay; sponsor covers configured items only; clearance from policy); permission Part 3A (registration service sees clearance status+expiry only; manual toggle denied; TEST-AUTH-005); Phase 4 read contract (FinanceClearance status+expiry; HELD fixture path). Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH5-001/004 (charges + verified payments). Owning module `finance`.

## User outcome and boundaries

Verified payments allocate to charges under the versioned demo policy (oldest-due-first within configured categories; overpayments to configured allocation/refund path, never silent reassignment); balance always recomputes from posted lines; each allocation/payment/reversal triggers clearance assessment writing FinanceClearance (status + expiry + policy version) and applying/releasing scoped finance holds (BLOCK_REGISTRATION etc.) with responsible office + resolution instructions. Reversal after clearance triggers governed recalculation + affected-workflow review flag. Sponsorship coverage (confirmed records, slice 6 writer) counts per its scope; promise ≠ cash. Registration finalize gate unchanged, now fed by the real writer (fixtures replaced).

## Policy and explicit demonstration scope

`FINANCE-DEMO-v1` fictional only: clearance demo rule (100% of period invoice allocated, or confirmed sponsorship covering the balance, or approved arrangement/exemption → CLEARED with 2026S1 expiry; partial → PENDING/HELD per arrears band; inconsistent → MANUAL_REVIEW). Student-facing wording map from journey book Part 2 §2. No manual clearance switch anywhere (denied + tested).

## State authorization failure and recovery

Calculation is system-owned (event-driven, idempotent per source version); students/finance read results; stale policy version refuses; concurrent payment+reversal serialized per account; recalculation failures leave last assessed status with retry audit; neutral 404s; denials 403 + audit.

## Proof and documentation

API tests: allocation order + overpayment path; balance reproducibility; clearance transitions (full → CLEARED; partial → pending/held wording; sponsor-covered → CLEARED; arrangement → CLEARED with expiry; reversal-after-clearance → governed recalculation + hold); manual-toggle denied for finance officer + sysadmin; registration finalize integration (real writer, no fixtures); idempotent reassessment; concurrent payment+reversal single outcome. Browser: clearance-complete vs action-required states with block-explanation (mobile/keyboard/SR). Record in PHASE-5 review + NOTE-PH5-005.

## Out of scope and open gates

Sponsorship/adjustment/refund writers + reconciliation UI (slice 6); real thresholds/policies (open decisions). Gates as TASK-PH5-001.

## Completion

Pending; see VERIFICATION. Human review pending.
