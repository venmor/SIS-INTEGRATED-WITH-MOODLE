# TASK-PH3-004: Eligibility and recommendation package

## Authority and ownership

User authorization: Phase 3 slices 3–6 implementation request, 2026-09-21. Release v0.4.0 track. Proposed learning rotation: lead Chitindu Milimbo; reviewer Charles Hangoma. These names assign rehearsal/review responsibilities, not completed human approval. Human review remains pending.

Controlling sources: handbook `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/05-phase-3-admissions-review-and-offer.md` slice 4; Journey A step 5; `02-INSTITUTIONAL-AND-SYSTEM-DESIGN/06-design-section-6-admissions-onboarding-and-student-finance.md` §§4–6 (pipeline, eligibility-vs-selection, per-choice records, AI boundary); `05-REQUIREMENTS-PERMISSIONS-DATA/` REQ-ADM-005 (review without modifying evidence), REQ-ADM-006 (recommendation/decision separation), ACT-ADM-001, permission §§15.1–15.4/15.9–15.10; applicant Part 9 §§3/10.4 (applicant/internal separation); UI constitution + `UI-DECISION-001` anatomy (frozen package, options, rationale, declaration, conflict status); security/idempotency/recovery. Exact records: `01-design-sections/006-...`, cross-blueprint `004-...` (Part 2C), `005-...` (Part 2D), `008-...` (Part 4). SUP-001–SUP-013 apply. Depends on TASK-PH3-001 (assignment gates every read/write). REST paths and test names are implementation-local, not invented handbook IDs.

## User outcome and boundaries

For one assigned application, the officer records an immutable recommendation package: per-choice eligibility outcome (minimum met or not, against the demo criteria version), a recommendation (favourable / unfavourable / needs-information), criterion references, and a rationale — without touching applicant data and without deciding anything. One active recommendation per application (supersede creates a new version, never an overwrite). The approver path cannot consume it as a decision. Owning module `admissions` (`review` area). Commands: RecordApplicationRecommendation, SupersedeApplicationRecommendation (new version of same command family). Recommendation text and scores never reach applicant views.

## Policy and explicit demonstration scope

`APPLICATION-DEMO-v1` fictional configuration only. Criteria are a demo enumeration with a versioned identifier (e.g. `DEMO-CRITERIA-v1`: completeness, declaration-match, document-quality, minimum-eligibility), not institutional assessment criteria; no grade produces a recommendation; automated eligibility rules remain later work (human records the outcome; AI prohibitions of Design §6 §8 apply — no auto-reject/approve/rank). Qualification verification stays declared-not-verified. Single-choice demo intake; per-choice rows stored so multi-choice policy can extend them. No delivery provider: pollable inbox projections only (GAP-008/009 hold).

## State authorization failure and recovery

Recommendation writes require an active assignment (claimed by the writer) plus intake scope, expected application version, and idempotency key bound to actor/action/payload; otherwise neutral 404s (unknown/other-officer) or 403 (approver/sysadmin/applicant role denial, audit-logged). Duplicate active recommendation returns `DUPLICATE_TASK` with the recommendation id; supersede requires the current recommendation id + reason and bumps the package version. All writes require CSRF checks. Retry uses the same key; uncertain outcomes resolve by command lookup. Staff-only rows never reach applicant timelines; applicant views proven unchanged by no-leak test.

## Proof and documentation

Required API tests: assigned-only write + neutral foreign/unknown; applicant/approver/sysadmin denial; version conflict; idempotency replay + mismatched-key conflict; duplicate-active suppression; supersede preserves history (old versions listed, byte-identical submitted snapshot); eligibility-vs-selection independence (eligible ≠ admitted — no decision created, no offer visible); no-leak (applicant timeline/notifications contain no recommendation); blank rationale rejection. Browser test: case comparison view extended with recommendation section, keyboard labels/focus, mobile reflow, error persistence. Record actual commands/results in `docs/learning/PHASE-3-IMPLEMENTATION-REVIEW.md`; no checked human replay without evidence.

## Out of scope and open gates

Slices 5–6 (real decision/offer, acceptance/onboarding); automated eligibility rules engine; verification adapters (ECZ/ZAQA); production storage/scanner; delivery worker and SMTP/SMS; deadline extensions; real UNZA roles/criteria/policy values; scoring/ranking models; sim-endpoint removal (slice 5). All production/demo policy approvals and manual assistive-technology/peer presentation checks remain explicit review gates.

## Completion

Bounded demonstration implementation and automated checks: pending; see `docs/learning/VERIFICATION.md` on completion. Human explanation/review: pending.
