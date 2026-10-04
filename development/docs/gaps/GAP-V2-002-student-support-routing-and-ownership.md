# GAP-V2-002 — Student support routing and accountable ownership

Status: Open — blocks live institutional activation of student support requests, adviser messaging, appointments and counselling referrals. An explicitly fictional, isolated demo route is available for synthetic testing only.
Raised: 2026-10-02

## Approved requirement and missing operational inputs

Exact Student Blueprint 2 Part 6 and Design Sections 8/12B approve the support journey: a student sees their assigned adviser, knows the receiving service **before** submitting a request, can respond to a human-reviewed invitation, and receives a persisted owner, follow-up and recovery route. Counselling remains in a restricted store with limited service-status disclosure. The current runnable model has no `ADVISER` or `COUNSELLOR` assignment, effective-dated student-to-adviser relationship, configured receiving-service directory, programme-office fallback task, restricted counselling case store or staffed appointment capacity. `SupportTicket` is an applicant application-case feature and cannot stand in for student support.

The handbook does not appoint actual university recipients, define emergency contacts/service hours, consent and disclosure versions, retention or appointment windows, or authorize a technical default that would route private requests to a generic inbox. The existing `SYSADMIN` role cannot become a counselling recipient by convenience.

## Safe implementation boundary

- Build the relationship, service-directory, queue, ownership and privacy contracts with synthetic fixtures, but keep live request submission disabled until a responsible receiving service and scoped staff appointments are configured and reviewed.
- The v2 demo slice persists academic requests and secure replies only when `DEMO_MODE=true`, the route is explicitly `demoOnly`, and a live selected adviser appointment and student relationship resolve. It does not imply an approved university service, response time, notification, appointment or confidential support channel.
- If no adviser is assigned, explain that state, show only a verified programme-office route, and create an accountable assignment task once a legitimate owner exists. Never display a fictional adviser or claim a request was sent without a persisted case and owner.
- Keep academic support, counselling, disability, safeguarding and discipline separated; expose only the minimum consented referral status to academic staff. Academic activity signals may invite human triage, never automatic diagnosis or counselling/discipline case creation.
- Require a non-AI human route. Do not present an unverified emergency number or promise immediate response.

## Decisions and evidence needed to activate

The institution must name service owners and receiver appointments by programme/campus; approve adviser assignment and substitute rules, intake routing, response hours and escalation, service-specific consent/disclosure and retention, confidential-record custody, emergency contact validation, appointment/no-show rules and handoff/reassignment recovery. Map the answers to role/capability/scope/relationship tests and an approved configuration version before enabling student submission. Lead Charles Hangoma and reviewer Chitindu Milimbo are implementation roles, not service appointments or human approval.

## Traceability

- Exact approved Student Blueprint 2 Part 6, Design Sections 8 and 12B, cross-blueprint privacy/visibility and UI status/recovery records.
- V2 spec §3.7–3.8 and Task 6; `MODULE-MATURITY.md` identifies student success/advising as designed only.
- GAP-V2-001/004/006 for organisation graph and role approval authority. Applicant `SupportTicket` remains separate.
