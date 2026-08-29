# Moodle Authority and Reconciliation

## Authority boundary

| Record | SIS | Moodle |
|---|---|---|
| Person/student institutional identity | Authoritative | Receives mapped account |
| Programme/curriculum/course offering | Authoritative | Receives learning shell/context |
| Institutional/course registration | Authoritative | Receives enrolment access |
| Teaching activity/submission | References as needed | Authoritative source |
| Provisional gradebook detail | Stages/imports | Authoritative learning evidence |
| Official result/progression/award | Authoritative | May display only approved returned information |

## Reliable synchronization

1. A valid SIS transaction commits the domain state and outbox record together.
2. The integration worker maps the versioned event to the configured Moodle adapter.
3. Delivery uses an idempotency/correlation key and records normalized response.
4. Retryable failures back off; permanent/configuration failures enter a governed queue.
5. Reconciliation compares expected SIS mapping/enrolment with Moodle state.
6. Operations may replay an approved event or correct a mapping, but cannot manually change official registration to make the queue green.
7. A case closes after both states and evidence agree.

## Grade staging

Moodle grades enter a staging snapshot linked to course, assessment mapping, student, source revision and import time. Validation/moderation occurs in SIS workflows. Publishing official results is a separate authorized command and cannot be triggered by a Moodle callback.

## Demonstration design

The presentation MVP uses a safe Moodle simulator or test instance. It demonstrates delayed delivery, duplicate delivery, failure, replay and reconciliation without production credentials.
