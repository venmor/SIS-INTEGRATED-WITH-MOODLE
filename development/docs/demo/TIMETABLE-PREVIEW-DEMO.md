# Fictional master timetable preview

The isolated review preview runs at `http://localhost:3154`. This is separate from the older site on port 3100.

## Open the preview

1. Open `/sign-in?returnTo=/admin/timetabling/master` on the review site.
2. Sign in as `nasilele.master` with the fictional password `Seed-2026-Master`. The coordinator account opens the preview directly.
3. The saved master preview appears first. The larger sample contains 12 courses, 24 sessions, four rooms and five teaching days, 5–9 October 2026 in Africa/Lusaka. Course titles accompany the codes.
4. Use **View** for the full master or one course. Each course has two sessions from the same saved master version. Use the day buttons and **Previous / Next** to scan the master in groups of ten. Expand a finding to see its exact affected session references.

`nasilele.scheduler` / `Seed-2026-Scheduler` is a separate campus rule-drafting account. It has no coordinator appointment, so workspace switching cannot grant it master access. On the demo sign-in page, expand **Try a fictional demo account** to find both timetable accounts and their purposes. API access continues to check the live appointment; a destination link grants no permission.

The sample is a draft preview. Its 24 roster-link findings are intentional: no official student enrolments were invented to turn a screen green. Approval, current-source revalidation, publication and student projection remain separate implementation work.

## Reproduce the sample in an isolated database

Configure `DATABASE_URL` for a loopback `test`, `review` or `ci` database, set `DEMO_MODE=true` and `SIS_ENABLE_TIMETABLE_DEMO_DRAFTS=true`, and start the API against that same database. The web server requires both switches to display the timetable demo account cards. Set `TIMETABLE_DEMO_API_URL` to the local API; the sample defaults to port 3155.

Run the seed without resetting the database:

```text
node scripts/with-env.mjs node prisma/seed/seed.ts
```

Create a complete saved teaching-window rule through the campus rules workspace if it is absent. The sample uses the latest complete `DEMO-MAIN` rule and never alters it. A rule excluding the sample's dates/hours will produce the corresponding blocking findings.

Then create the sample through the authenticated timetable API:

```text
node scripts/with-env.mjs node scripts/timetable-demo-sample.mjs
```

The script requires loopback endpoints and both switches. Its deterministic session/save references make an unchanged repeat return the same master version. A changed source or policy produces a new immutable version. It appends no official enrolments and preserves prior timetable history. The ten `DEM101`–`DEM110` fixture courses have no curriculum links; they are labelled fictional and exist only for the timetable rehearsal. Operators can create different sessions through the planning form.
