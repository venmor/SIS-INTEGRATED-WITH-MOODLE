# MOODLE-001 — Read-only transport and source-preserving live deferral

2026-10-07; `review/phase7-completion`, base `f6f797f`. [Packet](../task-packets/TASK-V2-MOODLE-001.md), [current cloud setup](../demo/MOODLE-CLOUD-CONNECTION-SETUP.md), [approved foundation plan](../superpowers/plans/2026-09-27-moodlecloud-live-test-foundation.md). Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending.

## Actual connection evidence

One user-authorized read-only form POST to `sis-moodle.moodlecloud.com` returned site-course ID **1**, release **5.2.2 (Build: 20260810)**, numeric version **2026042002** and only `core_webservice_get_site_info`. No course, enrolment, group, grade, student or calendar mutation was called. The owner confirmed deleting the temporary exposed token; revocation was not independently tested. The token was not persisted, and no replacement is configured. The authenticated call proves that identity check only.

Five non-secret local environment settings record explicit simulator mode and the verified origin/host/site/release. Remaining role/category/run/manifest settings are absent. The CLI helper accepts a token only through a hidden interactive prompt and prints selected safe identity/function metadata.

## Transport repair and decision

The read-only adapter now selects the canonical backend configuration, enforces exact HTTPS host/site/release, deterministic nested form parameters, no redirects, bounded response size and a deadline through response consumption. It rejects caller-supplied `wsfunction`, `wstoken` and `moodlewsrestformat` before network access, sanitizes provider failures and treats only established transport errors as retryable.

Approved design §8.4 permits credential/function query parameters. This implementation deliberately places trusted selectors and the token in the **POST body** to avoid credential-bearing URLs in infrastructure logs. Moodle's REST handler accepts POST parameters: [official source](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/webservice/rest/locallib.php#L75). The user authorized this privacy improvement; the original approved text is preserved. Tests verify an empty URL query and reject selectors supplied through either caller path.

Unsafe legacy mutations and unscoped reconciliation reads now refuse before Prisma/HTTP. Removed behavior included guessed category/visibility, fabricated user identity, role-presence-as-enrolment, unsupported participant fallback and unenrolment labelled as suspension. These functions will be reintroduced only with reviewed run, manifest, immutable identity/mapping and claim controls.

## Pending access is an actual state

Valid SIS source actions still commit their canonical outbox events with the source record. A requested live backend returns typed `NOT_PROVISIONED` before attempts, leases, retry counters, mapping mutations, reconciliation runs, successful command receipts or external calls. Static-valid live configuration and refused live configuration are both gated. Worker processed and deferred counts are separate; unrelated source events retain their behavior. Existing attempts and historical simulator delivery are preserved.

Manual provisioning, replay, mapping draft/test/activation, reconciliation and resolution still check authority and ordinary role/input/existence/separation rules. Deferral precedes cached simulator-success replay. Moodle operations-queue retry/redirect cannot reset or divert pending live work. Connection identity and write readiness are separate: a healthy identity probe cannot open provisioning.

Staff see zero-attempt source events separately from historical delivery rows. The readiness preview selects the oldest 100 waiting events, uses a 101-row lookahead to disclose omitted events, and presents ten rows at a time. It does not claim full server queue traversal; attempt history is labelled as a latest-100 preview. Full operations-queue search/filter/cursor paging remains a separate queue increment. Forms treat a 2xx deferral as pending rather than success. A student's official registration remains complete while Moodle access is being prepared; historical simulator delivery cannot label current live access synced. No re-registration is requested. An unavailable registration-status read cannot offer another registration based on a plan alone.

## Verification and remaining dependency

Final unit, type/build and browser results are recorded in [verification](VERIFICATION.md). Transport tests use mocked Moodle responses and make no live write. The UI fixture tests render actual pages/components with a local fixture API; they prove rendering and response handling, not a cloud integration. Registration projection unit tests exercise the real service with an in-memory Prisma boundary. The actual cloud identity check is recorded separately above.

This closes the interim pending-access workflow. Persisted run/transition authority, complete isolated manifest/database fingerprint, independently reviewed fresh authentication, immutable live mappings/identity bindings, durable claim/fencing/results, scoped reconciliation, operation-specific provisioning and grade/cohort/calendar extensions remain next work. Static environment strings cannot replace these records. Existing simulator attempt-immutability and broader mapping governance/history are not certified by this increment. Full live connection and production acceptance are not complete.
