# V2-SETUP-001 — operational setup readiness, 2026-10-02

The approved handbook models institutional structure as an effective-dated graph and separates business policy owners from System Administration. The current database has academic periods, programmes, offerings and curricula, but no approved organisation relationship registry, admission-cycle authority or institutional configuration publication workflow. `REQ-NFR-009` is therefore unmet as an operating capability.

Later status: [TASK-V2-SETUP-002](../task-packets/TASK-V2-SETUP-002.md) added draft structure and delivery identities to this inventory. The original absence statement above describes this slice's implementation date; approved organisation scope and configuration publication remain open.

The new read-only `GET /institution-setup/readiness` samples record counts and returns explicit `BLOCKED`, `MISSING` or `PRESENT_UNVERIFIED` sections. Only a current `SYSADMIN` assignment in `SYSTEM:GLOBAL` can call it; every permitted and denied authenticated read is purpose-audited. It contains no personal records, policy values or secrets. The System Operations page shows counts, missing decisions and next actions in a mobile-safe list. There are no configuration mutation endpoints in this slice.

The [governance proposal](../policies/INSTITUTION-CONFIGURATION-GOVERNANCE-PROPOSAL.md) gives the institution a decision agenda for owner, independent approver, publisher, scope, effective date, step-up and correction. It is not adopted policy. [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md) and related GAP-004/006/012 remain open; the report does not activate workflows or make seeded records authoritative.

## Verification

- Test database: isolated Docker PostgreSQL `sis_v2_review_20261002`, seeded fictional records; no shared database reset or external download.
- API e2e: `institution-setup-readiness.e2e-spec.ts` first failed with 404 before implementation, then **4/4 passed** on the real test database. It covers global System Administrator access, minimal projection/current counts, audit, anonymous/role/scope denial, revocation/expiry and absence of a setup write method.
- Browser: `setup-readiness.spec.ts` first failed because the navigation route was absent, then **1/1 passed** on a fresh API/web production build at 390px. It checked the section/gap content, no publish/approve/edit action and no horizontal overflow.
- API and web production builds passed. Typecheck, targeted API lint, web lint, source scan and final combined regressions are recorded in [VERIFICATION](VERIFICATION.md).

## Remaining controls

The report is a process inventory, not a configuration editor, certified snapshot or institutional signoff. Business-owner read authority, approved policy values, graph migration, saved draft/impact preview, separate approval/publication, historical versioning, emergency change and rollback must follow institutional decision and their own task packets. Manual screen-reader and low-bandwidth review are not yet recorded.
