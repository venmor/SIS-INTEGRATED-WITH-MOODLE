# Three-Story Demonstration Script

## Story 1 — Applicant to student

1. Applicant discovers a programme and sees requirements.
2. Creates/resumes draft, uploads fictional evidence and submits once.
3. Admissions compares declared/evidence data, requests clarification and recommends.
4. Separate authority offers; applicant accepts.
5. Controlled conversion creates student/programme attempt.
6. Student selects permitted courses and sees finance condition.
7. Simulated payment is reconciled; registration confirms.
8. Moodle enrolment is requested and later reconciled.

Explain: state machines, ownership, idempotency, permission separation and status language.

## Story 2 — Teaching evidence to official result

1. Lecturer opens assigned course/TG.
2. Provisional Moodle mark snapshot is staged.
3. Validation finds an invalid/missing mark.
4. Correct owner resolves it; examinations prepares decision package.
5. Authorized release publishes official SIS result.
6. Student sees published outcome and audit-safe timeline.

Explain: Moodle/SIS authority boundary, snapshots, moderation, release authority and amendment history.

## Story 3 — Governed support and operations recovery

1. Explainable academic observation enters adviser queue.
2. Adviser reviews, sends respectful invitation and schedules follow-up.
3. Show that adviser/Dean cannot view counselling notes.
4. Force Moodle/provider delivery failure.
5. Operations reviews safe event detail, retries/replays and reconciles.
6. Close incident only after expected/actual state agrees.

Explain: privacy, minimum disclosure, outbox, retry, dead letter, audit and reconciliation.
