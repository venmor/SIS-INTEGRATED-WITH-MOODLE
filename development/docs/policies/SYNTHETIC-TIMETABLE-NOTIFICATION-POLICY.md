# Fictional timetable notification policy — NOTIFY-TIMETABLE-v1

Date: 2026-10-15. Fictional implementation contract authorized with the timetable continuation. Lead Charles Hangoma; reviewer Chitindu Milimbo. Chisomo Demonstration University only; this is not institutional policy or human acceptance.

## Source and recipients

The Notifications owner consumes `DemoTimetablePublished` for the `DemoTimetable` aggregate only when the timetable demo boundary is enabled. Resolve the aggregate ID to an immutable publication governed by `DEMO-TIME-PUBLISH-2026.1`. Event payloads cannot grant entitlement or supply notification content, recipients or destinations.

Environment decision, 15 October: the owner-authorised Vercel demonstration uses the existing explicit cloud-demonstration flag, exact database host/name pins and secure connection validation in the shared demo boundary. A random cloud or production database is not permitted. This refines the earlier loopback-only task wording to match the user's deployment instruction; it does not relax the runtime gate. Vercel does not run the background interval: an authorised global administrator must invoke the existing bounded manual worker endpoint. Automatic cloud scheduling is not claimed.

Candidate recipients are accounts linked to the student persons and programme attempts in the publication's current or previous immutable student-session manifest. At dispatch they must have an active account/person/student/attempt, the attempt's assigned published curriculum, a `REGISTERED` institutional registration in the publication period, an `ENROLLED` referenced course registration, and a currently effective unrevoked `STUDENT` appointment with `study`. Closed, cancelled, archived and suspended periods are excluded. Accounts created after publication are excluded. A notification never establishes entitlement to timetable content; the destination rechecks current access independently.

One notice is addressed to each eligible account for the publication, even when several sessions or attempts qualify. Its action URL contains an owned qualifying source attempt and the actual period code. Where several qualifying source attempts exist, use the lexically first attempt ID for a deterministic bounded destination. An unrelated programme attempt is never selected.

## Record, delivery and recovery

Initial publication uses `TIMETABLE_PUBLISHED`; a replacement uses `TIMETABLE_UPDATED`. The notice is a mandatory learning/timetable update with plain-language availability/change wording, a secure `/student/timetable` action and the Timetabling responsible office. It is informational and creates no submission deadline. No names, class lists, contacts, grades, balances or support details are copied into its body.

The deduplication key is `timetable:<publicationId>:<accountId>`. Preserve prior notices and read receipts. Replayed or duplicated owner events cannot create a second record or delivery for that publication/account.

Process one event page of at most 50 eligible accounts per tick in account-ID order. Event locking, authoritative notice/delivery creation, cursor/count updates and page audit commit atomically. A failed page leaves no partial notices or progress and retries from its prior cursor. Dispatch progress belongs to `TimetableNotificationDispatch`, independently of other owners' use of `OutboxEvent.deliveredAt`.

Missing or unrecognized owned publication sources become `BLOCKED` with a safe reason and audit event. This does not acknowledge another owner or stop subsequent valid events. The demo kill-switch leaves this consumer pending without creating notices.

Only `IN_SYSTEM` is created. The delivery worker advances its actual portal state and leaves `providerRef` empty. Email/SMS, Moodle calendars, provider acknowledgements and calendar subscriptions remain outside this policy. Failure to process/deliver a notice never changes registration or publication.

## Manual operation and audit

The global manual worker endpoint requires the current authenticated `SYSADMIN` assignment at exact `SYSTEM:GLOBAL` scope with `administer-identity`, effective dates, no revocation and active account/person. Require CSRF protection and retain neutral denied responses. Denied manual runs are audited without credentials or session values. The internal worker timer does not require an interactive human appointment.

Page audit records the owner event, source publication, processed/created counts, completion, policy and outcome. It does not copy recipient lists. Existing notification read/action privacy controls remain applicable.

The controlling requirements and verification map are in [TASK-V2-NOTIFY-001](../task-packets/TASK-V2-NOTIFY-001.md). The original [publication policy](SYNTHETIC-TIMETABLE-PUBLICATION-POLICY.md) remains authoritative for independent publication; completion of this in-system owner does not imply external delivery or close any production gate.
