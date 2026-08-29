# Step 3 — Phase 2: Applicant Self-Service

**Release target:** v0.3.0

## User/system outcome

An applicant can discover a programme, create/resume a draft, enter qualifications, upload safe documents, review declarations, submit exactly once and receive a receipt/status.

## Read before planning

- Applicant Journey Book Parts 1–8
- UI form/upload/action contracts
- Functional requirements and action contracts
- File, privacy, rate-limit and idempotency rules

## Learning goals

- React/Next.js forms and state
- NestJS controllers/services/validation
- Prisma schema/migrations
- File upload/quarantine concepts
- Transactions and idempotency

## Ordered delivery slices

1. Public programme discovery
2. Applicant home and application draft
3. Personal/contact/qualification sections
4. Document upload/quarantine/preview/replacement
5. Review/declaration/formal submission/receipt
6. Status timeline and safe resume/recovery

## Security, integrity and recovery focus

- Own-application scope only
- Upload type/size/quarantine/scan boundary
- Submission/idempotency key
- Sensitive identity masking
- Draft/version conflict handling

## Required proof

- Draft save/resume and validation
- Unsafe/unsupported upload denial
- Double click/refresh/connection-loss submission
- Cross-applicant access denial
- Mobile/keyboard/screen-reader form completion

## Team rotation and documentation

The lead builds the first complete vertical slice; the reviewer traces every screen to API/data/audit, adds failure tests and presents the architecture. Swap for the next applicant sub-slice.

## Demonstration checkpoint

Start a fictional application on one device, resume, recover from a failed save, submit once and show the immutable receipt/audit timeline.

## Exit gate

- One connected journey works without admissions staff
- No real payment/provider required
- All critical states are visible
- Learning note explains UI-to-database flow
