# TASK-V2-APP-002 — Demonstration intake and evidence clarity

Date: 19 October 2026. Lead: Charles Hangoma. Proposed reviewer: Chitundu Milimbo; review is pending.

We observed that the three original demonstration offerings had either a 30 September deadline or a closed state. The applicant API correctly refused edits after the deadline, so Bwalya's upload controls were disabled. We retained that server rule and reopened only the identified synthetic 2026S1 SWE, RAD and BBA offerings for 90 days on the pinned demonstration database. The previously saved application and documents remained intact. New local demo seeds use a rolling 90-day deadline and keep a separate closed later intake to demonstrate unavailable states. The isolated test-offering helper can repair stale fixture rows without resetting a database.

We now request identity evidence separately from qualification evidence. The identity label is NRC for domestic routes and passport for international routes; result, prior-award and postgraduate labels follow the selected route and programme level. The applicant must choose a document type before upload. Server-side categories and readiness checks enforce the same requirements. A safety-scanned document still needs official review; it is not automatically verified. This is a synthetic demonstration document policy, not an approved university admissions rule.

Sources: Design Section 6, Applicant Blueprint Part 6, existing TASK-V2-APP-001, and the approved catalogue-authoring design. The production document matrix and intake authority remain an institutional gap. Tests: applications API requirement and submission checks, applicant browser flow, TypeScript builds, and public catalogue response. No private applicant data or API credential belongs in this packet.
