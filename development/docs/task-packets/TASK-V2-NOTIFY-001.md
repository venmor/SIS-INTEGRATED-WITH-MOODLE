# TASK-V2-NOTIFY-001 — Timetable publication notice owner

Date: 2026-10-15. Lead Charles Hangoma; reviewer Chitindu Milimbo. Authorized fictional follow-up to [TIME-007](TASK-V2-TIME-007.md). Implementation verification in progress; human and institutional acceptance remain pending.

## Outcome and boundary

A genuine fictional timetable publication produces one authoritative own-account notice per eligible account. Replacements produce a new update notice while retaining earlier notices and read receipts. The secure action selects the source programme attempt and academic period. This slice consumes the existing durable `DemoTimetablePublished` event; it does not create another publication workflow or send email/SMS.

Use [NOTIFY-TIMETABLE-v1](../policies/SYNTHETIC-TIMETABLE-NOTIFICATION-POLICY.md) and the existing [publication policy](../policies/SYNTHETIC-TIMETABLE-PUBLICATION-POLICY.md). Synthetic data is limited to explicit loopback review/test/CI targets or the already owner-authorised, explicitly pinned cloud demonstration target. This follows the user's instruction to deploy and demonstrate the same data/workflows on Vercel; it grants no production or institutional authority. SETUP-004 academic governance, examination timetables, external providers, exports and institutional signoff are outside this slice.

## Source authority

The complete exact records linked below remain active requirements. No approved source text is changed.

- [Recovery Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/008-cross-blueprint-implementation-set-part-4-error-recovery-and-notification-catalogue.md), §§16.4–16.7 and 16.11–16.15: neutral authorization errors, recoverable duplicate-safe processing, authoritative notices, delivery states and minimized audit.
- [Student Blueprint 2 Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/015-role-blueprint-2-new-student-and-continuing-undergraduate-student.md), §§3, 5.4 and 8–11: current timetable, changes, retained source history and registration-preserved failures.
- [Permission Part 3A](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/006-cross-blueprint-implementation-set-part-3a-permission-and-information-visibility-matrix-co.md), §§15.3, 15.5 and 15.9: current self-service relationship and immediate authority expiry; system administration does not confer academic publication authority.
- [Design Section 10](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/010-design-section-10-security-privacy-audit-records-and-resilience.md), §§11–13, 16, 19–20 and 33: current identity/authority, isolated migrations, append-only audit and explicit production gates.
- [Notification source packet PH8-001](TASK-PH8-001.md): existing record/delivery owner, mandatory notices, recipient isolation and worker concurrency. The exact compendium §§12.13 and student §8 and quality §11.39 govern authoritative in-system records and neutral external prompts.

Apply the handbook supersession register and readiness matrix. The user's fictional-policy authorization is sufficient for these synthetic values and does not close institutional policy/provider gaps.

## Contract and proof

- Resolve the event's aggregate to the immutable owned publication. Never trust payload recipient IDs, attempt IDs, URLs or notification text.
- Derive recipients from current/previous immutable session lineage intersected with current active student/person/account/programme attempt, published assigned curriculum, registered period roster, enrolled course registration and a live `STUDENT` appointment with `study`. Accounts created after publication do not receive a historical notice.
- Process at most 50 eligible accounts in one event page. Persist progress, notification records and deliveries in the same transaction under an event row lock. Distinct events for one publication converge to the publication/account deduplication key.
- Keep dispatch progress separate from `OutboxEvent.deliveredAt`. A missing source blocks that owned handoff with safe audit evidence and allows subsequent events to progress.
- Only `IN_SYSTEM` delivery is created. Its completion has no fabricated external provider reference. Existing read receipts are preserved across replay and replacement.
- Require an authenticated live `SYSADMIN` appointment at `SYSTEM:GLOBAL` with `administer-identity` and active account/person for the manual worker route, with CSRF protection and denial audit. The internal timer continues under its existing service lifecycle.

Connected proof in `apps/api/test/timetable-notifications.e2e-spec.ts`: actual publish → own notice → exact link → real in-system delivery; replacement/read history; forged payload/privacy; dropped/withdrawn/inactive/expired/future/revoked/missing-capability entitlement; 50/55 durable pagination with racing workers; duplicate events; transaction failure/retry; missing publication; demo gate; closed period; unrelated attempt and late account; manual-route unauthenticated/CSRF/role/scope/person/expiry denials.

Closure requires fresh connected proof, appropriate API regression/unit checks, scoped lint/type/source checks and a learning note. Root coordinates builds and browser verification. No commit, push, shared-database reset, human signoff or external delivery is implied by this packet.
