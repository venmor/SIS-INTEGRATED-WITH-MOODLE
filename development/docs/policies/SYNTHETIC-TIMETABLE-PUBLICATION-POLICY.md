# Synthetic timetable publication policy — DEMO-TIME-PUBLISH-2026.1

Date: 2026-10-08. Status: fictional implementation contract under the user's instruction to finish the additional timetable work, create synthetic policies and close demonstration slices. Lead Charles Hangoma; reviewer Chitindu Milimbo; human walkthrough and production acceptance pending. This is not UNZA policy, an institutional appointment, MFA or production approval.

## Scope and source ownership

Use **Chisomo Demonstration University**, `DEMO-UNIVERSITY`, and synthetic records only. The timetable workflow requires `DEMO_MODE=true`, `SIS_ENABLE_TIMETABLE_DEMO_DRAFTS=true` and either a loopback database identified as review/test/CI or the existing explicitly pinned cloud demonstration boundary. This 15 October clarification follows the owner's instruction to demonstrate the same workflows on Vercel; the shared cloud flag, exact database host/name pins and secure-connection validation remain required. A disabled boundary denies both publication and its fictional student projection. All external delivery remains outside this policy. It grants no institutional or production authority.

Academic registration remains authoritative for enrolment, student/attempt status and assigned curriculum. Academic delivery supplies course versions, period-bound offerings/sections and active teaching appointments. Timetabling supplies the immutable master, current validation and publication history. A programme admissions offering is not a teaching offering; tutorial-group text and student IDs alone cannot establish section membership.

Under [ADR-004](../adr/ADR-004-synthetic-timetable-planning-contract.md), each immutable master session's explicit `registrationIds` is its proposed section allocation manifest. The server resolves each ID to its official synthetic course registration, programme attempt, course, period and student; checks the matching section/offering; and records resolved source facts. Independent publication reviews that exact manifest. This scoped increment needs no parallel membership entity. It does not implement a general institutional section-allocation service.

## Runnable scenario

Demonstrate publication with **SWE111 — Programming Fundamentals** and **MTH111 — Discrete Mathematics** in a distinct fictional publication period with matching dated rule, offerings/sections, rooms, active teachers and genuine completed synthetic registrations. Those courses already have curriculum relationships; the attempt's assigned published curriculum is checked explicitly, never replaced by whichever curriculum is latest.

The 12-course/24-session preview remains preserved. DEM101–110 have no official curriculum/enrolment links in that preview; their missing-roster findings stay blocking. A separate complete publication scenario demonstrates the workflow without inventing registrations, updating blocked immutable drafts or weakening validation. More courses require explicit configured academic relationships and genuine enrolments before they can join a publication scenario.

## Appointments and independent review

| Action | Required fictional appointment |
|---|---|
| Prepare/read master | Active `TIMETABLE_COORDINATOR`, exact `SYSTEM:DEMO-UNIVERSITY` scope, explicit `timetable-demo-master-draft` capability |
| Review publication package and publish/replace | Active `DOMAIN_ADMIN`, exact same scope, explicit `timetable-demo-master-publish` capability |
| Read personal published timetable | Current student self-service appointment, identity linked to the selected programme attempt, currently entitled enrolled courses |

Setup, system-administration or allocation capabilities do not imply publication authority. Another account belonging to the same person cannot approve the proposer’s master. New drafts record their original proposer person and appointment; older drafts without verifiable provenance cannot publish. The approval transaction validates the original preparer's required appointment and the approver's independent current appointment.

Appointments, account/person state and effective dates are checked at request and transaction time. Lock relevant appointment/account/person and credential rows against concurrent revocation/change, and recheck natural expiry before committing. No synthetic emergency bypass or collision override is provided.

## Exact package and password reconfirmation

The review package contains the immutable master ID/version, period, complete session manifest, policy/rule/source facts and digest, current blocking findings, expected preceding publication, and changed/cancelled activity impact. Display permitted lecturer names, course/section, time and venue facts; never disclose a full student class list in a global preview.

The approver must provide a reason of 10–500 characters and separately confirm `reviewed:true` and `fictionalOnly:true`; neither confirmation is pre-ticked. The command binds a UUID reference, exact target/master digest, expected publication ID and decision payload. The user reviews the exact version being approved; a later source or package change requires renewed review.

Fresh password reconfirmation is mandatory for a new publication/replacement. Exactly one usable active password credential is required; absent, superseded, inactive or ambiguous credentials deny. Incorrect or empty password denies. Reconfirmation is limited to five attempts per account per 15 minutes, with a safe retry response.

Record authentication strength as **`DEMO_PASSWORD_RECONFIRMATION`** with actor/person, appointment/scope, policy version, approval meaning, reason, digest, time and outcome. Password, hash, session token and credential secrets never enter command fingerprints, receipts, audit, logs or events. This mechanism does not satisfy institutional staff MFA, production step-up or secure digital-signature requirements.

## Fresh validation and atomic publication

1. Re-read the selected complete dated rule and current master/source context. Reject stale latest-master/rule expectations; a saved conflict-free label is insufficient.
2. Resolve every proposed registration to its current enrolled course, matching registered attempt/period, active student and applicable assigned curriculum. Reject missing/dropped/withdrawn records, mismatched course/period, contradictory section membership, incomplete class coverage and seats below current enrolled membership.
3. Revalidate section/offering, current teaching appointment, venue/capacity/access, teaching window, room turnaround, overlap and configured campus travel. Changes to reviewed source facts require a fresh master/review even when they produce no new collision.
4. Every blocking issue denies publication. Preserve prior drafts/publications and report the exact safe correction. There is no “force ready”, status update or trigger exception.
5. Under an atomic publication lock and expected-publication comparison, append immutable publication/source lineage, commit the active replacement, receipt, minimal audit and durable `DemoTimetablePublished` owner event together. A failure rolls back all new success effects and leaves the prior publication intact.

Publication pins the master manifest and records its source versions. A student projection must retain the source course-registration/programme-attempt references rather than only a copied student ID. Publication and projection history are append-only; correction/replacement creates new rows. Do not cascade-delete the publication or historical projections.

## Retry, replacement and owner handoffs

Matching actor/request reference and complete target/decision fingerprint return the same recorded receipt. Reusing a reference for another draft, digest, predecessor or reason is refused. Current read/action authority remains required; retrieving a past receipt does not assert that it is still the current timetable. An uncertain browser response retains the UUID and checks recorded history before another action is enabled.

Replacement reviews the new complete master, predecessor and exact changed/cancelled activities. The old version stays auditable and current until atomic replacement succeeds. A receipt reports **`FICTIONAL_PUBLISHED`**, the publication/master/period/version, time and source references; the UI also shows whether that publication remains current.

`DemoTimetablePublished` is a durable **pending Timetabling owner handoff**, with **`externalDelivery: NONE`**. It is not evidence of delivered email, SMS, Moodle calendar updates or completed notification processing. In-system change notices become authoritative only when their owner creates the actual records; until then show that handoff as pending. Do not invent a successful delivery row or mark the full notification workstream complete from an outbox insertion.

The 2026-10-15 [NOTIFY-001 owner](../task-packets/TASK-V2-NOTIFY-001.md), under [NOTIFY-TIMETABLE-v1](SYNTHETIC-TIMETABLE-NOTIFICATION-POLICY.md), implements that bounded in-system handoff. Its separate dispatch ledger records actual notice creation and page completion. New events remain pending until processed; an event or completed publication does not itself assert delivery. Email/SMS and other external handoffs remain outside both fictional policies.

## Student visibility and change handling

The student timetable joins the exact current publication manifest with currently enrolled registrations for the **selected own programme attempt and period**. Course drops, withdrawal, access revocation and another attempt's courses cannot leave stale class entitlement. Recheck course/attempt/student status and active appointment rather than serving an unrestricted copied projection. A new course absent from the current published manifest remains being prepared until validated replacement; registration remains valid.

Show **Fictional university rehearsal**, publication version, last-confirmed/checked time, current/superseded status, and dated classes in **Africa/Lusaka (CAT)**. Provide week/day/list and course filtering, named date navigation and bounded ten-row list pages. Display course, section, time, venue/campus and allowed lecturer name. Exclude private contacts, other students, class lists, grades, finance and support information. Never render draft sessions on a student page.

Changed/cancelled activities are described in plain text and retain their version history. Empty, unavailable and publication-pending states distinguish a valid registration from timetable preparation. Stale/service failures retain the last-confirmed date without calling a partial refresh complete. Keyboard operation, meaningful loading/status messages, small-screen reflow and reduced motion form part of verification.

## Evidence and institutional boundary

Implement and verify [TASK-V2-TIME-007](../task-packets/TASK-V2-TIME-007.md) with real allowed/denied commands, current-source changes, same-person aliases, credential/appointment races and expiry, stale/concurrent/replayed commands, rollback, SQL immutability and real staff/student browser stories. No green type check or fixture row alone closes publication.

Sources: exact [Design Section 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/004-design-section-4-curriculum-programmes-and-academic-delivery.md); [Student Blueprint 2 Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/015-role-blueprint-2-new-student-and-continuing-undergraduate-student.md), §§3, 5.4, 8–11; [Design Section 10](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/010-design-section-10-security-privacy-audit-records-and-resilience.md), §§11–13, 16, 19–20, 25, 33; [Permission Part 3A](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/006-cross-blueprint-implementation-set-part-3a-permission-and-information-visibility-matrix-co.md), §§15.5, 15.9; UI Part 2B/2D and Recovery Part 4 linked in the task packet. Original exact records are unchanged.

This explicit fictional policy enables the authorized rehearsal. It does not close [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md), production timetable/override authority, general curriculum/section-allocation governance, examinations, live Moodle or full TASK-101–105 scope.

## Implementation refinements — 2026-10-11

The immutable master retains a single source-context snapshot containing the concrete calendar and institution-unit version references used during validation. Publication pins that master; it does not duplicate source metadata across every session. Existing drafts without source context remain readable and must be saved as a new reviewed version before publication. The earlier applied publication migration is preserved; an additive source-context migration supplies the new field without rewriting history.

Setup activation, rule saving, master saving and publication coordinate their source transitions through a consistent lock order. Mutable account, appointment, credential, academic and delivery facts are rechecked within the protected decision. A source fingerprint is a change detector, not a replacement for retrievable version references.

Replacement impact includes changes to section membership even when time and room stay the same. Staff receive counts, not class lists; the affected-student total excludes unchanged activities and unchanged memberships. Current and superseded receipts remain distinct.

Before a browser sends a publication decision it retains the bounded exact nonsecret command in actor-and-appointment-scoped tab session storage. Passwords, student identities and class lists are excluded. Reload/restored-tab recovery freezes that command until the server confirms its exact receipt. Session storage cannot promise recovery in a wholly new tab/device; production pending-command custody and retention remain a separately governed server responsibility. Failure to retain the reference prevents sending a new decision.

A failed student timetable refresh may retain only the last-confirmed timestamp under the authenticated actor, explicit programme attempt and period. Previously returned sessions are not cached or treated as current entitlement. A failed staff source check disables approval and requires a fresh check and new confirmation.
