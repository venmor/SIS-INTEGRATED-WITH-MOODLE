# V2-ADM-001 — admissions queue navigation, 2026-10-02

The earlier reviewer queue stopped at a capped first window. This slice queries bounded pages in the database after applying active reviewer assignment, intake, state and action-needed restrictions. A signed opaque cursor binds the active actor and assignment to the normalized query; a stale or altered cursor is refused. The UI retains scope, filters and page size in the URL. A saved invalid page link offers a restart at the first page with those selections preserved.

The queue projection remains a case reference, state, version, submitted/claimed time and open-work counts. It includes no applicant name, contact or evidence. Claim/release, individual recommendation and independent decision behavior remain in their existing domains. There is no bulk admission decision in this slice.

## Evidence

- Test database: isolated Docker PostgreSQL `sis_v2_review_20261002`, seeded fictional records only.
- API `review-queue.e2e-spec.ts`: **14/14 passed**. The cursor case includes equal timestamps, a case arriving after page one, no repeated or omitted existing case, actor and filter binding, tamper refusal, revoked assignment refusal and exact minimal row fields. Existing claim/release, cross-intake and approver denial tests passed.
- Browser `admissions-queue.spec.ts`: **3/3 passed** on a fresh production build. The first is the full officer claim/review/approver journey; the second checks 390px next/previous URL navigation; the third was observed failing before the saved-link recovery was added and now passes.
- Combined with setup readiness: **18/18 API** and **4/4 browser** passed. Full unit suite: **309 passed, 13 skipped**. Builds, typecheck, lint (warnings outside touched files), source scan and diff whitespace check passed.
- Opt-in synthetic scale check: `RUN_SYNTHETIC_LOAD=true vitest run --config apps/api/vitest.config.e2e.ts apps/api/test/review-queue-scale.e2e-spec.ts` passed **1/1** on the isolated local database. It generated 20,000 fictional submitted applications and traversed all 200 pages of 100 without duplicate IDs or omissions. Observed request times on this machine: p50 **30.5 ms**, p95 **46.3 ms**, max **162.1 ms**; one 429 response was honored using `Retry-After`. The complete run took **64.88 s**, including the rate-limit wait. These are local observations, not agreed service targets or production load proof.

## Limitations

Keyset traversal is stable for the ordered records that remain in scope. A new case inserted *before* the current cursor or a case whose assignment/state changes can require restarting from the first page to see the current queue. The UI exposes refresh and restart but does not promise a frozen snapshot. The 20,000-case run used this local machine and a synthetic intake; realistic concurrent staff load, changed assignments, manual assistive-technology and low-bandwidth use, and institutional role-authority review remain open acceptance work. The current intake-prefix scope is still an interim rule pending GAP-004. The generated formal submissions remain in the isolated test database because SQL immutability also blocks test cleanup; its measured size after the run was 51 MB.
