# Timetable notice owner — implementation and verification

Date: 2026-10-15. Branch `review/v2-all-pages-and-timetable-notices-20261014`. Lead Charles Hangoma; reviewer Chitindu Milimbo. [Task](../task-packets/TASK-V2-NOTIFY-001.md), [fictional policy](../policies/SYNTHETIC-TIMETABLE-NOTIFICATION-POLICY.md). Human review, institutional authority and external providers remain pending.

## Behavior and ownership

Real synthetic timetable publication now leads to an authoritative own-account notification with an owned programme-attempt/period action link. Replacements retain earlier notices and read receipts. The own inbox returns the explanation, responsible office and action path; staff-signal and detail projections were not widened.

The worker resolves the durable event's aggregate to an immutable timetable publication. It ignores recipient/context values in the payload. Current and previous immutable session lineage is intersected with current account/person/student/attempt/curriculum/registration/course/appointment entitlement. Accounts created after publication are excluded. A deterministic qualifying source attempt supplies the action link; another attempt cannot acquire its sessions through this notice.

`TimetableNotificationDispatch` is an additive consumer-owned ledger. One tick records at most 50 eligible accounts, with event lock, versioned notification template, actual records/deliveries, cursor/counts and page audit in one transaction. A publication row lock also serializes duplicate events sharing a publication/account deduplication key. This leaves `OutboxEvent.deliveredAt` available to other owners. Missing source events become safely `BLOCKED`; failed pages retain their prior progress and retry without partial notices.

Only real `IN_SYSTEM` delivery is created. Its provider reference remains empty. The existing timer lifecycle remains active outside Vercel; the manual endpoint now requires current `SYSADMIN`, `SYSTEM:GLOBAL`, `administer-identity`, active account/person and CSRF. Safe authority denials are audited. Delivery rows are locked inside the transaction that advances them, so racing ticks cannot overwrite a completed state or fabricate an additional delivery attempt.

## Fresh isolated evidence

The original Docker service was inactive. Root restored an isolated native PostgreSQL service on loopback port 5547; this slice created fresh database `sis_notices_setup003_test_20261015`. All 77 migrations applied successfully, including `20261014213000_timetable_notification_dispatch`, followed by client generation and synthetic seeding. No existing review database was reset or reused. The retained UI database was not touched by these tests.

Logs below are retained in ignored `.local-release/` at the review-worktree root. Commands ran under Node 24.21.0 with `DATABASE_URL` set to the dedicated database.

- Initial connected RED: every scenario failed at the genuine SQL `NotificationRecord_templateId_fkey`, proving the inherited policy-name-as-template-ID implementation could not create a notice (`notices-red-20261015.log`). The implementation now creates/pins the owner-versioned template in the same transaction.
- Follow-up RED reproduced inactive-person administrator access and a disabled-demo dispatch (`notices-red-remaining-20261015.log`). One unrelated-attempt fixture initially hit the active-application uniqueness constraint; the fixture was corrected to use a distinct actual offering.
- Own-inbox RED proved `body`, `office` and `actionPath` were absent, while the authority and demo-gate cases still failed (`notices-red-own-inbox-20261015.log`).
- Widening duplicate-event inserts with an isolated test-only SQL trigger exposed `NotificationRecord_dedupe_key` during racing ticks: 11 passed, 1 failed in the recorded tool run. Publication locking fixed that race. The trigger is removed in `finally`; no production test hook exists.
- Connected GREEN: **12/12 passed**, 34.20 seconds (`notices-green-20261015.log`). This covers real publish/replace/read history, forged recipient payload and foreign reads, dropped/withdrawn/inactive/expired/future/revoked/missing-capability denial, 50/55 paging and durable counts, rollback/retry, manual session/CSRF/authority denials, late accounts/unrelated attempts, closed periods, the demo gate, duplicate events and blocked source recovery.
- Scoped type-aware lint, API TypeScript check and Prisma validation passed (`notices-lint-20261015.log`, `notices-typecheck-20261015.log`, `notices-schema-20261015.log`). `git diff --check` passed.

Connected command:

```sh
DEMO_MODE=true VERCEL=1 npm run test:e2e --workspace=api -- \
  --run test/timetable-notifications.e2e-spec.ts --no-file-parallelism
```

The explicit `VERCEL=1` disables background timers for the connected suite; each tick is invoked deliberately. It must be unset for the complete API unit suite's timer-registration tests.

The first complete unit run had 445 passed and 13 skipped, one cron-registration failure caused by `VERCEL=1`, and seven transient `@sis/config` import failures while a concurrent root build regenerated that package (`notices-unit-20261015.log`). The stable rerun with `VERCEL` unset passed **490 tests across all 40 files**, with 13 existing skips, in 20.56 seconds (`notices-unit-stable-20261015.log`). No skipped test is claimed as executed.

The initial five-file connected regression had **56 passed, 1 failed** (`notices-regression-20261015.log`): the master-preview suite requires `DEMO-2026-TEACHING`, which the first seed omitted because `SIS_ENABLE_TIMETABLE_DEMO_DRAFTS` was not enabled during seeding. Running the existing gated seed additively in the owned database supplied the missing fixture. The corrected master-preview and operations-incident suites then passed **18/18**, 7.64 seconds (`notices-regression-fixture-20261015.log`). Existing manual-worker callers use live global SYSADMIN fixtures; their access was preserved without weakening the guard. The CI runner already supplies the seed flag and clones to compatible dedicated loopback `setup003_test` targets.

A final isolated six-file run passed **72/72** using separate fresh baseline clones: notifications 16, timetable publication 23, master 3, rules 3, timetable notifications 12 and operations incidents 15 (`notices-connected-isolated-verified-20261015.log`). An earlier combined rerun reused a mutated master fixture and conflicted with its expected initial version; the isolated runner preserves each suite's baseline instead of weakening the version checks.

Stable unit command:

```sh
env -u VERCEL DEMO_MODE=true npm run test --workspace=api -- --no-file-parallelism
```

## Limits and presentation

This slice proves the in-system owner, not email/SMS, Moodle calendars or institutional notification readiness. The inherited partial implementation already existed when resumed; the recorded RED runs do not establish that every final semantic case individually failed before its original implementation. Root coordinates builds and browser proof of the visible own-notice action. No browser, commit, merge, push or production operation was performed by this slice.

For presentation: publish an independently reviewed fictional timetable, run/await the notice owner, open the student's own notification, and follow its exact academic context. A publication receipt, pending event, created notice and delivered/read state are separate facts. A delivery failure leaves official registration and timetable publication intact. SETUP-004 remains specified future work; this notice owner does not implement academic governance or human acceptance.
