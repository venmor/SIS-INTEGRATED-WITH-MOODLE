# TASK-V2-ADM-002 — Scoped exact case-reference search

## Authority and scope

- Release: v2.0 Task 3 read-only admissions workbench increment. Lead Charles Hangoma; reviewer Chitundu Milimbo. Human review is pending.
- Basis: `REQ-ADM-005`, `REQ-ADM-006`, `REQ-NFR-005`, `ACT-ADM-001`, the admissions role and permission evidence listed in [TASK-V2-ADM-001](TASK-V2-ADM-001.md), the UI constitution, recovery strategy and supersession register. This is a refinement of the existing reviewer queue, not a new institutional authority.
- Open boundary: GAP-004 still makes `INTAKE` prefix scope interim. This slice cannot approve broader school/programme routing or workload allocation.

## User outcome and contract

An officer who has a case reference can find it in the current **My cases** or **Claimable pool** view without paging through a large intake. The reference is an exact, case-insensitive match; whitespace at the edges is ignored. State and action-needed filters still apply. A case outside the active assignment, claimed by another officer, or absent gives the same empty queue result. The query returns only the existing minimum queue projection, not applicant identity or evidence.

`GET /review/queue` accepts bounded, validated `reference` alongside the existing parameters. The database applies reference, state, action-needed, claim and intake predicates before the page limit. The signed cursor binds the normalized reference so a cursor from another search is refused. The web form and URL preserve the search through refresh and saved links; clearing the filter returns to the first page. No search term or result rows are stored in browser storage.

An additive PostgreSQL `pg_trgm` GIN index supports case-insensitive exact reference matching without rewriting the immutable historical references. The migration has no data rewrite; deployment still needs normal migration review and a lock/size window on a real populated database.

## Evidence and exclusions

- API: in-scope exact result, uppercase/trimmed input, peer-claimed and missing neutral results, invalid input refusal, cursor/query mismatch, and existing authorization regressions.
- Browser: 390px search, URL/reload persistence, empty result, clear filter, no overflow; each journey signs in as a distinct fictional officer to honor the real sign-in rate limit.
- No new provider, business-data write, policy value, permission, bulk decision, allocation or live record. The only schema change is the lookup index. This does not complete Task 3 sorting, workload assignment, batch preparation, or staffing acceptance.
