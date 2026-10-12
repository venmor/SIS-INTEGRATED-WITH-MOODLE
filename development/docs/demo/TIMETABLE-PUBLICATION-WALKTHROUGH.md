# Fictional timetable publication walkthrough

This walkthrough covers the **Chisomo Demonstration University** scenario in `DEMO-2026-PUBLICATION`: genuine synthetic SWE111/MTH111 course registrations, a saved master, independent publication and the student's own timetable. It describes actions to demonstrate; it is not a verification record or human acceptance. Charles Hangoma and Chitindu Milimbo must record the actual outcome separately.

Controlling scope: [TIME-007 task packet](../task-packets/TASK-V2-TIME-007.md), [DEMO-TIME-PUBLISH-2026.1](../policies/SYNTHETIC-TIMETABLE-PUBLICATION-POLICY.md), [implementation note](../learning/NOTE-V2-TIME-007.md) and [current verification record](../learning/VERIFICATION.md).

## Local entry and fictional accounts

Open **http://127.0.0.1:3154/sign-in**. The local API is **http://127.0.0.1:3155**. These addresses require the isolated review processes to be running against the same owned review database. Keep the same web origin during a recovery exercise; `localhost` and `127.0.0.1` have different browser storage.

| Purpose | Username | Fictional password | Destination |
|---|---|---|---|
| Prepare and inspect the master | `nasilele.master` | `Seed-2026-Master` | `/admin/timetabling/master` |
| Independently review and publish | `tembo.timetable` | `Seed-2026-Timetable` | `/admin/timetabling/publications` |
| Read the student's own timetable | `chanda.time` | `Seed-2026-Student` | `/student/timetable?period=DEMO-2026-PUBLICATION` |
| Prepare campus rule drafts | `nasilele.scheduler` | `Seed-2026-Scheduler` | `/admin/timetabling/demo-rules` |

These are deliberately fictional seed credentials, never production credentials. Use separate browser profiles/private windows for the coordinator, reviewer and student, or sign in again when switching accounts. The scheduler's `CAMPUS:DEMO-MAIN` appointment does not grant master or publication authority. The coordinator and publisher hold different `SYSTEM:DEMO-UNIVERSITY` capabilities; a role title or destination link grants no additional permission. Publication authority does not grant university-setup access. The scripted appointments end on 2027-01-01; expiry or changed credentials require owner review, not automatic renewal.

## Prepare the isolated scenario

Run commands from the canonical review worktree's `development/` directory. Use an already migrated and seeded, backed-up **owned** loopback review/test/CI database. The required baseline includes the published SWE curriculum containing SWE111 and MTH111, the `DEMO-MAIN` campus, `DEMO-R1` venue and fictional teacher `mutinta.l`. Apply reviewed additive migrations, including the master source-context migration, through the owner's existing migration procedure before preparing this scenario. The script does not apply migrations or reset a database.

Set `DATABASE_URL` in the private local environment to that exact database. Its host must be `localhost`, `127.0.0.1` or `::1`; its database name must contain an underscore-delimited `review`, `test` or `ci` component, as enforced by the script. Never paste the connection value into walkthrough evidence. Existing shell environment variables take precedence over `development/.env` when using `with-env.mjs`.

The API and web processes both need `DEMO_MODE=true` and `SIS_ENABLE_TIMETABLE_DEMO_DRAFTS=true`; start web with `API_INTERNAL_URL=http://127.0.0.1:3155`. Keep Moodle in its separately labelled simulator/deferred configuration. The preparation API URL must be an HTTP loopback root without user information, query, fragment or additional path.

To prepare only the missing fictional source actors, admitted student/attempt, period and delivery/teaching links:

```sh
DEMO_MODE=true SIS_ENABLE_TIMETABLE_DEMO_DRAFTS=true TIMETABLE_DEMO_API_URL=http://127.0.0.1:3155 node scripts/with-env.mjs node scripts/timetable-publication-demo.mjs --prepare-only
```

`--prepare-only` still writes missing synthetic source fixtures. It does not submit the student's registration or save the teaching rule/master. Its `SOURCE_READY`, `masterDraftId: null` and `sessions: 0` output is preparation status only.

To additionally complete the student's registration through the real registration APIs, save the scenario rule if absent and save the source-validated master through the coordinator API:

```sh
DEMO_MODE=true SIS_ENABLE_TIMETABLE_DEMO_DRAFTS=true TIMETABLE_DEMO_API_URL=http://127.0.0.1:3155 node scripts/with-env.mjs node scripts/timetable-publication-demo.mjs
```

The script validates existing actor credentials/appointments and preserves existing source records. It stops on incompatible state, missing genuine enrolment or blocking findings. Read the refusal and correct the owned source through its responsible workflow; do not change an immutable draft's status, replace credentials, remove triggers or reset data to obtain a green result.

The default command has **no automatic publication**. Retain its returned period and `masterDraftId`, then inspect that exact proposal in the UI. `CONFLICT_FREE_FOR_REVIEW` means a saved proposal, not a published timetable. An unchanged rerun can return the existing immutable save; it does not guarantee that the returned proposal remains the latest or currently publishable. If current source checks identify a superseded/stale proposal, prepare a fresh complete version and review it again.

The initial scenario has 12 sessions, six per course:

| Dates in October 2026 | Course | CAT time | Venue / section |
|---|---|---|---|
| 12, 13, 14, 15, 16 and 19 | SWE111 — Programming Fundamentals | 08:00–09:00 | `DEMO-R1` / `DEMO-PUBLISH-A` |
| 12, 13, 14, 15, 16 and 19 | MTH111 — Discrete Mathematics | 09:30–10:30 | `DEMO-R1` / `DEMO-PUBLISH-A` |

The script proposes 20 seats per occurrence and resolves real synthetic course-registration, section and teacher links. The initial teaching rule covers 12 October–18 December, weekdays 08:00–18:00 CAT, with a 10-minute room turnaround. Existing configured rules are reused and remain subject to current validation.

The separate **12-course/24-session preview** remains preserved under its original period. Its DEM101–DEM110 courses have no invented official curriculum/enrolment links. Retain and explain its genuine roster/coverage blockers. It is not the publication scenario, and completing SWE111/MTH111 does not make that larger preview publishable.

## Review and independently publish

1. Sign in as `nasilele.master` and open **Master timetable preview**. Select the returned master and inspect the full master, each course and its findings. Saving did not publish classes. Open **Review publication**, select `DEMO-2026-PUBLICATION` and the exact proposal. Explain why its proposing person cannot approve it.
2. Sign in separately as `tembo.timetable` and open **Timetable publication**. Select the same period and proposal. Use **Next sessions / Previous sessions** to inspect all 12 sessions; course filtering is an alternative projection of that master. **Older proposals / Newer proposals / Latest proposals** traverse the selected period's history.
3. Read **Current source checks**, the proposer, checked time, latest publication/predecessor and added/changed/removed/affected-learner counts. Inspect the before/after activity details, lecturer, section, delivery mode, room and CAT times. Expand **Policy and source details** to inspect the saved/current fingerprints, rule, calendar and unit references. Counts are not a class list.
4. Continue only when the exact proposal is ready for independent review. A blocked or stale candidate needs source correction and a fresh saved version; there is no force-publish action. A failed source refresh disables a new approval. Use **Check publication state**, inspect the fresh result and make fresh declarations.
5. Enter a reason of 10–500 characters. Deliberately tick the two initially unticked declarations and enter `tembo.timetable`'s password in **Confirm your password**. Select **Approve and publish** once. This is fictional password reconfirmation, not institutional MFA or a production digital signature.
6. Inspect the matching publication receipt, version, time and **current** or **superseded** label. Check **Publication history**. A historical receipt proves that exact decision was recorded; it does not prove it is still the current timetable.

Publication atomically appends the decision, source-linked student projections, audit and a durable `DemoTimetablePublished` event. That event is a **pending Timetabling owner handoff** with `externalDelivery: NONE`. It proves no notification processing, in-system notice, email, SMS, Moodle or calendar delivery. Do not call an outbox insertion a delivered update.

## Check the student's timetable

Sign in as `chanda.time` and open **http://127.0.0.1:3154/student/timetable?period=DEMO-2026-PUBLICATION**. The route binds the response to the server-confirmed own programme attempt and explicit period. Use this period link for the separate rehearsal; generic portal navigation still resolves the registration policy's current period, and a portal-wide own-registration context selector remains follow-up work. The visible classes must come from the current publication intersected with that attempt's current enrolled courses, not from a draft or another student's/attempt's manifest.

The retained preview was exercised on 2026-10-12 through a 12-session publication and an 11-session replacement. It therefore currently shows the replacement, rather than an unpublished initial proposal. Version numbers can advance during further testing. Select **All published weeks** to inspect the full list and its second page; expand **Timetable changes** for the moved and cancelled sessions.

Inspect SWE111 and MTH111, publication version/freshness and **Fictional university rehearsal** wording. Traverse week, day and list views, the course filter and ten-row list pages; read dates/times in Africa/Lusaka (CAT). Timetable preparation, a newly enrolled course absent from the manifest or an unavailable read must not imply that official registration failed. A failed refresh may retain only the correctly scoped last-confirmed date; previously returned sessions must not be treated as current entitlement.

## Recover an uncertain publication

Use this procedure if a connection interruption or lost response leaves the approval uncertain; the demonstration environment must remain isolated.

1. Keep the reviewer tab and the displayed UUID reference. The proposal and reason remain frozen. Select **Check publication state** to look up that exact actor's receipt, including a receipt outside the current history page.
2. If the reference is unresolved, preserve it. **Retry publication** uses the same target, digest, predecessor, declarations and reason with fresh password entry. Do not create a new decision, switch targets or edit the retained payload to guess the outcome. A later refusal does not establish that an earlier uncertain request failed.
3. For reload/restored-tab recovery, remain on the same web origin and authenticate under the same account and appointment. The tab's actor/appointment-scoped session storage retains the bounded nonsecret command, never the password. The restored decision stays frozen until a matching server receipt is confirmed. Re-enter a password only for a same-reference retry.
4. Check whether the recovered receipt is current or superseded. Only exact receipt confirmation clears the uncertain reference. Storage failure prevents a new POST; do not clear storage or manufacture a receipt to bypass that state. A wholly new tab/device is not guaranteed recovery custody; preserve the reference and use the responsible owner/support route if recovery cannot be established.

## Prepare and review a replacement

The coordinator prepares a **complete successor master** for the same period. The current publication remains authoritative until independent replacement succeeds. The preparation script has no replacement flag and must not be used as an automatic publication/recovery tool.

For a form-based rehearsal, use **Plan sessions** on `/admin/timetabling/master`: select the publication period and complete rule, then enter the complete successor's section, venue, teacher, dated times, seats and explicit registered-learner links. The form starts with new editor rows; selecting a saved preview does not load that immutable master into the editor. Recreate every retained occurrence, rather than submitting only the changed row. **Save and check conflicts** appends a new master. New editor rows have new occurrence IDs, so review their resulting added/cancelled impact honestly.

For a focused comparison that labels an existing occurrence **Changed**, use the existing coordinator draft API to retain its session ID. `POST /timetabling/demo-master` (browser proxy `/api/timetabling/demo-master`) accepts `clientRequestId`, latest `expectedVersion`, `periodId`, `ruleDraftId` and the complete `sessions` array. Each session contains only `id`, `sectionId`, `venueId`, `teacherAssignmentId`, `registrationIds`, `startAt`, `endAt`, `plannedSeats` and `requiresStepFreeAccess`. Obtain the current period-scoped draft history and permitted source catalogue through the authenticated owner API; do not copy display fields or invent membership. Keep unchanged occurrence IDs, retain a moved occurrence's ID and omit a deliberately cancelled occurrence. The connected [browser scenario](../../tests/browser/timetable-publication.spec.ts) illustrates this owner command; its presence is not a claim that it has passed.

One bounded rehearsal is to move SWE111 on 12 October from 08:00–09:00 to **08:10–09:10 CAT**, cancel the MTH111 occurrence on 19 October and retain the other occurrences. This proposes an 11-session successor; current source/conflict validation decides whether it is acceptable. Preserve its draft UUID after an uncertain save and inspect the saved history before retrying. A stale expected version requires reloading the current owner state and preparing a reviewed successor, not overwriting history.

As the independent reviewer, select the new proposal, check the actual current predecessor and inspect every impact page and before/after/cancelled detail. Enter a new reason, fresh declarations and password, then publish through the UI. Refresh Chanda's own timetable and inspect its new version, retained classes and plain-language changes. The preceding receipt must remain auditable and be labelled superseded. If a source change, stale predecessor or failed transaction prevents replacement, the previous publication must remain current; preserve the error and hand it to the responsible owner.

## Human walkthrough checklist — pending

- [ ] Charles and Chitindu identify the owned isolated database, applicable fictional policy and separate actor appointments.
- [ ] Explain source preparation versus genuine API registration, saved master, independent publication and pending owner handoff.
- [ ] Inspect all initial 12 sessions and genuine source links while preserving the separate blocked 12-course preview.
- [ ] Demonstrate coordinator self-approval denial and the independent reviewer's deliberate declarations/password step.
- [ ] Confirm the exact publication receipt and the student's selected own attempt/period timetable.
- [ ] Demonstrate uncertain-response, same-reference and restored-tab recovery without a second publication or stored password.
- [ ] Demonstrate a failed source refresh, fresh recheck and renewed confirmation before a new approval.
- [ ] Demonstrate complete successor review, changed/cancelled activities, superseded history and the student's updated timetable.
- [ ] Demonstrate entitlement denial after a controlled synthetic drop/withdrawal or access change, without changing another person's data.
- [ ] Complete the primary staff/student tasks by keyboard, inspect narrow-screen reflow/reduced motion and perform human screen-reader review.
- [ ] Record actual evidence, unresolved failures and named follow-up ownership in the verification record; leave unobserved items unchecked.

This fictional rehearsal supplies no institutional configuration/publication authority, production MFA, provider acceptance, operational signoff or v2.0 release approval. [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md), [GAP-021](../gaps/GAP-021-real-timetable-validation.md), general section-allocation governance, notification-owner processing, lecturer/examination journeys and production recovery/accessibility gates retain their separate ownership and acceptance work.
