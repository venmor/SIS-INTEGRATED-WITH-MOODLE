# Learning Note — TASK-PH5-001 (versioned fee assessment)

- Lead developer: Charles Hangoma (proposed; TASK-PH5-001)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-23 / v0.6.0 track Phase 5 slice 1
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Finance-officer-triggered fee assessment for a registered attempt+period:
one finance account per student, one invoice per account+period with an
official `INV-YYYY-NNNN` reference (DB sequence), and immutable posted
charge lines — one flat registration fee plus one per-course fee per
enrolled roster course. Re-assessment after roster changes appends missing
lines only; posted lines are never edited. Money is integer minor units +
ZMW everywhere; components format, never calculate. Students read their own
invoice; assessment is a finance authority act.

## Frontend

- `/student/finance` finance home (slice-1 scope: issued invoice with
  reference, due date, policy version, lines, total) + `lib/money.ts`
  Zambian formatter + `/api/finance` read-only proxy + student-home link.

## Backend/domain

- `finance` module: `assessCharges` (FINANCE_OFFICER + `assess-charges`
  only; attempt required; registration required; idempotent via shared
  command table; per-account serialization; append-only line logic),
  `readInvoice` (STUDENT own-record only + view audit).
- `FINANCE-DEMO-v1` config: per-course strategy (DEC-FIN-001 as
  configuration), fictional amounts, due dates, methods, clearance rule,
  student-facing wording map.

## Database/migration

- `20260925090000_ph5_finance_assessment`: `FinanceAccount`,
  `FinanceInvoice` (+ `InvoiceNumberSeq`), `FinanceChargeLine`; opposite
  `financeCharges` on `Course`, `invoices` on `AcademicPeriod`,
  `financeAccount` on `Student`.

## Security + authz

- Students assess nothing (403); lecturers see no amounts (403 on assess +
  invoice read); cross-student reads impossible (caller-bound); neutral
  404s; CSRF; idempotency keys; concurrent pair converges to one invoice.

## Tests and what they prove

- `finance-assessment.e2e-spec.ts` (8 tests): happy path
  (reference/policy/lines/total math), money metadata on every line,
  append-only re-assessment after an approved roster addition (posted ids
  untouched), idempotent replay, concurrent single invoice, unknown
  registration/period 404, denials, own-record reads. Green on fresh DB.
- Browser `student-portal.spec.ts` extended: assess via real API, invoice
  page shows reference + lines + due date + total. Green.

## What failed or confused us

- New relations missed opposite fields on `AcademicPeriod` (P1012);
  added `invoices`.
- Spec reused the name `app` for the student, shadowing the Nest app;
  aliased the Nest instance.
- "Other student" read returned 404 because that student was never
  assessed — correct behavior; the test now assesses both.
- Browser reference assertion hit strict-mode (reference shown twice);
  asserted the full notice title.

## Terms and concepts

- Invoice issued ≠ paid ≠ cleared; posted ≠ editable; minor units; policy
  version on every line.

## Questions to revise

- Charge/allocation/clearance code matrix; why assessment is finance-only;
  where DEC-FIN-001 lives (config strategy).
