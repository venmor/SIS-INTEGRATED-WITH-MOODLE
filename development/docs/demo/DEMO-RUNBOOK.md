# SIS–Moodle Demo Runbook

Use only fictional local demo data. Never rehearse against production or a remote database.

## 1. Prepare

From `development/`:

```bash
npm run db:start
npm run demo:reset
npm run demo:doctor
```

Start the application in two terminals:

```bash
npm run dev:api
npm run dev:web
```

Optional release gate:

```bash
npm run demo:rehearse
```

Use a clean browser profile. Keep credentials in operator notes, not on the presentation screen.

## 2. Story order

**Story 1 — Admissions → Student → Finance → Registration → Moodle**

1. Start at `/applications` with the seeded released-offer applicant checkpoint.
2. Use the seeded registered student checkpoint for `/student`, `/student/finance` and registration evidence.
3. Show that Moodle access is a governed projection of the SIS registration state.

**Story 2 — Teaching → Assessment → Official results**

1. Start at `/admin/teaching/groups` with the programme coordinator persona.
2. Show SIS-owned tutorial-group and teaching authority.
3. Continue to `/design-preview/assessment`.
4. State explicitly: **Design preview · No live records or actions.** Official results are not live until Phase 7 backend authority exists.

**Story 3 — Moodle failure → Integration recovery**

1. Start at `/admin/integration` with Integration Support.
2. Inspect the seeded dead letter and delivery detail.
3. Review replay evidence and four-eyes consequence.
4. Open `/admin/integration/reconciliation` and show the seeded mismatch/recovery state.

## 3. Failure injection and recovery

Use only the demo simulator controls. Never change SIS source records to imitate a provider failure.

- Moodle outage: use the demo simulator mode from the Moodle/Integration workspace, then run the worker.
- Recovery: restore simulator success, release/retry the governed delivery, then reconcile.
- Payment uncertainty: retain the payment reference and do not initiate a second payment while status is unknown.
- API/provider unavailable: keep the current reference, restore connectivity, then retry from the owning workspace.

## 4. Fallback evidence

If a live step cannot be completed, switch to:

- `/demo/evidence` — release, authorization, accessibility and known-limitations pack.
- `/admin/audit` — actor/role/scope/outcome evidence.
- `/admin/integration` — retained delivery, replay and incident evidence.
- `/admin/integration/reconciliation` — SIS expected state versus Moodle destination state.
- `/design-preview/assessment` — honest Phase-7 visual contract.

## 5. Finish

Do not leave the demo database as evidence of a production action. Stop local services when finished:

```bash
npm run db:stop
```

For another presentation, start again from `npm run demo:reset` so the story checkpoints are deterministic.
