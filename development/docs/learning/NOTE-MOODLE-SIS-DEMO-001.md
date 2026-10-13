# Generated SIS/Moodle demonstration bootstrap — 2026-10-13

The four generated Moodle identities previously had no counterpart registration contexts in SIS. The bounded bootstrap adds the same usernames, separate password hashes supplied only at runtime, one DEMO-EE curriculum and twelve public-title courses. Synthetic credits/type/capacity, three study blocks and dates are recorded in TASK-MOODLE-SIS-DEMO-001; they are not UNZA regulations.

The important distinction is identity → own study context → draft plan → formal registration. Bootstrap stops at an admitted attempt and explicit context choices. The existing plan/submit APIs remain responsible for validation, declarations, immutable receipt/snapshot, roster, audit and Moodle outbox. Source labels do not certify progression. Teacher authority remains scoped and does not include approval/release.

Run from development with DEMO_MODE=true, SIS_ENABLE_MOODLE_DEMO_BOOTSTRAP=true and the existing exact cloud database pins (or local isolated review/test target):

```sh
node scripts/with-env.mjs node scripts/prepare-moodle-demo-sis.mjs --manifest-file /absolute/ignored/catalogue.json --credentials-file /absolute/ignored/credentials.json
```

Manifest shape is the public catalogue preview (namespace, generated provenance, version1.0.0, four users, twelve courses and48 enrolments). Credential shape is the existing dictionary `{ "sis.demo.chanda.mulenga": "<runtime-only>", ... }`, exactly the four generated username keys, without a wrapper. Manifest usernames and idnumbers must agree exactly under sis-demo-2026; cross-namespace or swapped idnumbers are refused. Both paths must pass git check-ignore; credential permissions must exclude group/other access. Inputs are never echoed; unexpected failures print a sanitized refusal. The safe stdout receipt contains no passwords, hashes, provider IDs or private URLs.

Repeat runs verify exact existing records and password hashes, without credential rotation or replacement. Writes are transactional. Shared2026S1 is reused only while its actual registration dates are currently usable, and never updated. When missing, closed, not yet open or expired, the first block uses a new DEMO-EE-FOUNDATION context. Explicit attempt/period output must be used; generic current-period navigation is not proof of the selected context. Existing registered attempts may remain ACTIVE; no prior formal records are overwritten. An audit records the bootstrap version and counts, not the manifest or secrets.

Source verification: five focused Node tests pass for local/cloud target refusal, exact generated inventory, deterministic IDs/allowed selections mismatched object refusal and expired/shared-period fallback without date mutation. No database/provider was contacted for those tests. Database transaction, safe repeat, actual student plan+submit and deployed login remain unverified until the operator records execution evidence. No live automatic Moodle delivery, SSO, verified link UI or human acceptance is claimed.

## Deployed demonstration verification — 14 October 2026

PR17 merged at `2d743c9d6e370cd0b0bf62ce3f721088a60c30ff`. GitHub CI38451267557 passed the connected PostgreSQL suites, build/typecheck, 127 default browser tests, 26 dedicated Moodle-deferral browser tests and the backup rehearsal. Both public Vercel aliases point to READY deployments of that merge.

A fresh private PostgreSQL custom-format backup completed and passed archive-list verification before the additive bootstrap. Initial pooled acquisition exceeded Prisma's default two-second transaction wait before the transaction could start; the operator verified the bounded thirty-second acquisition fix, retained the two-minute transaction limit, and successfully repeated the actual script without replacing credentials or existing records. The fix is recorded in source and a focused regression check.

All four generated accounts authenticated against the deployed API in their intended STUDENT/LEC workspaces. The three students each completed three explicit study-block registrations through the normal plan/readiness/submit APIs: nine immutable receipts and thirty-six course registrations. API read-back verified each exact course set. A deployed Chromium journey independently verified Chanda Mulenga's sign-in, student navigation, registered Physics course and 390px layout without horizontal overflow. Private evidence is retained outside Git; generated passwords remain in the existing ignored credentials file.

Moodle access is a separate login using the same supplied demonstration credentials; this is not SSO. Twelve Moodle courses and forty-eight memberships were provisioned administratively and representative learner access was owner-confirmed. SIS registration read-back reports Queued under the existing simulator configuration; that is not live Moodle delivery evidence. No automatic delivery, grade exchange, published timetable for this new programme or institutional approval is claimed.
