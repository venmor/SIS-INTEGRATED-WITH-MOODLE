# TASK-V2-SETUP-001 — Institution setup readiness, operational read view

## Authority and boundary

- Release: v2.0 setup foundation; lead Charles Hangoma, reviewer Chitindu Milimbo. These are work assignments, not human signoff.
- Approved basis: `REQ-NFR-009`, Design Sections 1 and 3, Role Blueprint 12 Part 1 §§12.1–12.3, the UI constitution, and the active security/permission/recovery records. `SUP-009`, `SUP-010`, `SUP-012` and `SUP-013` preserve demo and source boundaries.
- Readiness matrix: System/IAM operations are “Ready for planned slice” with environment and privileged-role controls. This task shows operational metadata only to an active global System Administrator. It gives no academic/financial configuration authority.
- Open gaps: [GAP-004](../gaps/GAP-004-scope-registry.md), [GAP-006](../gaps/GAP-006-approver-authority.md), [GAP-012](../gaps/GAP-012-sod-pairs-review.md), [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md). These block institution configuration writes and institutional readiness claims.

## User outcome

A System Administrator can see which foundational records exist and which setup controls are absent. The report names the responsible institutional decision or design gap and never treats fictional seeded records as approved policy. An unrelated, expired or revoked assignment cannot read it.

## Contract

- `GET /institution-setup/readiness` is a read-only, purpose-audited operational query. It requires a live `SYSADMIN` assignment in `SYSTEM:GLOBAL`; the endpoint returns counts and control states, never person, applicant, student, fee, credential, policy-value or secret content.
- Sections cover organisational scope registry, academic periods, programme/offering/curriculum inventory, admission cycles, and configuration authority. `BLOCKED` means a required authority/model is absent; `PRESENT_UNVERIFIED` means records exist but no institutional approval is proven; `MISSING` means no records exist. Overall status remains `BLOCKED` while the controlling gaps remain open.
- Data counts are sampled at request time and labelled accordingly. They are not a certified snapshot or approval. The server, not the web page, enforces authorization.
- The System Administration workspace exposes a concise read-only page with accessible states and a direct route to the missing setup decision. No editing, publishing, importing or guessed default values are added.

## Acceptance and tests

- API allow, anonymous denial, non-System-Administrator denial, expired/revoked assignment denial, scope denial, minimum projection, no-write and audit checks.
- Browser test on the synthetic seeded environment: System Administrator sees current blocked/unverified sections and no setup action; mobile/keyboard route remains usable. No external data or provider calls.
- Typecheck, lint, source scan and focused API/browser regression results enter the learning note. Manual screen-reader, human authority review and institutional activation remain separate gates.

## Excluded

Configuration drafts/writes/approval/publication, generic ConfigurationItem mutation, organisational graph migration, admission cycle creation, real policy values, Moodle cloud, production credentials and production data.
