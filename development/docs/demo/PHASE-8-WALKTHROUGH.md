# Phase 8 walkthrough rehearsal (slices 1–6)

Human-run only. Assumes local API on 3101 + web on 3100 against
the seeded `sis` database (`bwalya.m` / `Seed-2026-Bwalya` etc.;
passwords are `Seed-2026-<FirstName>`). Fictional data only.
Each slice: setup, click-path, questions to answer aloud (model
answers included — rephrase in your own words), one safe
failure to demonstrate. Do not claim a pass you did not run;
record passes in the review notes, not here.

## Slice 1 — Notifications (`/notifications`, `/admin/notifications`)

- Setup: sign in as `chanda.k` (student). If the inbox is empty,
  run `tests/browser/notifications.spec.ts --headed` once and
  watch it create, deliver and read a mandatory notice.
- Click-path: inbox → open a RESULT notice → Mark as read →
  confirm no mute control on mandatory notices.
- Q&A: *Who can mute what?* Optional categories mute; mandatory
  never mutes. *Does a failed delivery change the underlying
  decision?* No — delivery state is separate; dead-letters
  escalate to staff follow-up. *Where do staff see signals?*
  Scoped projection over the same records, not a parallel table.
- Safe failure: none needed here (slice 3 covers dead-letters).

## Slice 2 — Audit timeline (package History section)

- Setup: sign in as `mutinta.l` (lecturer); open a board
  package with a decision (`/admin/assessment/packages/[id]`,
  History section). Or watch `entity-timeline.spec.ts --headed`.
- Click-path: History → confirm decision + version + audit rows
  appear newest-first.
- Q&A: *Why do students see less?* Same gates as the direct
  endpoints; staff-only rows filtered exactly like
  `visibleTimeline`. *What does an outsider get?* Neutral 404,
  no disclosure. *Are reads audited?* Yes, like the trail.

## Slice 3 — Ops queue (`/admin/ops` as `kunda.b`)

- Setup: sign in as `kunda.b` (integration support). For a live
  incident, watch `ops-queue.spec.ts --headed` (armed failure →
  dead-letter → incident → ack → resolve → close).
- Click-path: queue counts → incident rows → acknowledge (takes
  ownership) → resolve with root cause + 20-char evidence →
  close. Show Recently resolved keeps its evidence.
- Q&A: *What auto-opens incidents?* Non-mandatory dead-letters
  (both domains) + manual opens; mandatory stays on the
  examinations lane, linked read-only. *Why two dead-letters,
  one incident?* Convergent dedupe: one OPEN per source.
  *Why no 429-incidents?* An attacker could flood the queue.
- Safe failure: open an incident, resolve with an 8-char
  evidence string → refused 400; then do it properly.

## Slice 4 — Rate limits (no UI; API + messages)

- Setup: none (behavioural).
- Click-path: search the catalogue rapidly until 429; show
  `Retry-After` + neutral message; sign in wrong 5 times (use
  a throwaway account, never `bwalya.m`) → locked 15 min.
- Q&A: *What complements authz?* Budgets + idempotency +
  uniqueness; limits never replace permission checks. *Daily
  upload quota?* 10/user/day (Lusaka day), 429 + audit.
  *Why no per-IP submit budget?* GAP-023: the flow is
  authenticated; anonymous row doesn't map — recorded, not
  guessed.

## Slice 5 — Accessibility (keyboard-only whole pass)

- Setup: unplug the mouse (mentally). 390px viewport.
- Click-path: Tab from address bar → skip link → main;
  discover → programme (full load keeps top focus) → sign-in
  link (SPA moves focus to main); fail sign-in → focus enters
  the summary; zoom 200% → no h-scroll.
- Q&A: *Why does focus move on some navigations and not
  others?* SPA repairs focus; full-load cards keep standard
  top-of-document focus (UI package can't import next/link).
  *Colour contrast?* Script-proven 11/11; A5/A6 darkened two
  text grades. *Screen-reader bulk?* Manual checklist
  (`ACCESSIBILITY-CHECKLIST.md`) — run it, don't claim it.

## Slice 6 — Backup (terminal demo)

- Setup: none destructive (never on shared DBs).
- Click-path: show `backup:test` TABLES (103) + drift guard;
  show a drill reconciliation JSON shape; explain
  counts + orphans + hash check.
- Q&A: *What would silent corruption look like?* Matching
  counts with mismatched bytes — caught by the `sha256`
  aggregate. *Why did the script rot before?* No drift guard;
  now any unknown table fails the gate. *Full-data proof?*
  GAP-024: finance/assessment rows need the Node-24/CI run.
- Safe failure: n/a (read-only drill).

## After all six

Both developers: draw the notification→dead-letter→incident
chain, the quota path, and the restore-reconcile flow without
reading code. Then sign the human review record in
`APPLICANT-WALKTHROUGH.md` and the accessibility checklist.

## Release rehearsal (slice 7 — presenter + reviewer together)

- Show the three `demo:reset` refusals (no flag, shared
  project name, shared port): each exits 2 with zero side
  effects. Explain why the shared service can never be the
  target (name-based refusal, not documentation).
- Describe the isolated rehearsal evidence (51 migrations,
  shared true/true, seed-skipped reason, full teardown) —
  do NOT rerun it live against any shared database.
- Release candidate proposal: tag `v0.9.0-rc1` (human git
  action). Rollback story: redeploy the pre-release build;
  the database stays forward (additive migrations, no down
  path) — say this explicitly, never imply a downgrade.
- Q&A: *What happens on a failed deployment?* Return to the
  last known-good release (TEST-REC-007). *What proves a
  restore works?* Counts + orphans + hash check, not the
  dump file's existence.
