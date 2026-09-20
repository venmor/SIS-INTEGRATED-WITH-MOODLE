# ADR-002 — Bounded applicant demonstration and preserved source authority

Date: 2026-09-19. Status: implementation decision under the user's authorization; institutional production policy and human acceptance pending.

## Context

The user requested review of earlier phases and Phase 2 slices 2–5, including readable learning records. The handbook allows explicitly demo-only policy at the development entry gate and requires the exact applicant blueprints, not only their summaries. Registration/MFA/providers and institutional policies are incomplete.

## Decision

Extend the existing modular monolith. Admissions owns drafts, revisions, documents, immutable submission snapshots and persistent commands. It reads identity and published programme data and writes existing audit/outbox records through the current shared kernel. It does not write person credentials, academic results, student conversion, finance balances or Moodle records.

Use `APPLICATION-DEMO-v1` in `packages/config/src/applications.ts` for clearly fictional values and versioned declarations. Published programme/fee identity participates in the requirement fingerprint. Unsupported or changed policy blocks editing/submission until a deliberate valid programme change. The static fixture is not the production runtime policy editor.

Store document bytes privately in PostgreSQL for this small demonstration. Normal ClamAV handling fails closed. A clean antivirus result alone cannot approve arbitrary PDFs: structural PDF validation is still required. Explicit `DEMO_MODE=true` and `APPLICATION_SCANNER=demo-fixtures` accept only one byte-for-byte bundled fictional PDF. This is an allowlist, not a malware detector.

Submission uses a database transaction with an owner lock, optimistic application version and persistent command key. It stores a snapshot/receipt, declarations, audit and a pending outbox event together. SQL prevents updates/deletes to submission snapshots. Later notification delivery and staff assessment are separate work.

One added direct development dependency, `@playwright/test` 1.63.0, enables the browser proof already required by the locked stack. No Tailwind, microservice, message broker or new production provider is added.

The user-authorized evidence rename preserves 70 original records. SUP-012/013 record navigation and factual status corrections. Historical approvals are not rewritten.

## Consequences

This is suitable for review using fictional data and a controlled local environment. It is not a completed production phase gate. [GAP-015](../gaps/GAP-015-applicant-production-and-prior-phase-gates.md) records required policy, identity, storage, scanner and human follow-up. Browser scenarios use unique fictional accounts and retain immutable submitted records in isolated test databases; tests do not reset shared development data.
