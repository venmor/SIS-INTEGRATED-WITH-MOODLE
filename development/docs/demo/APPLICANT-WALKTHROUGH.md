# Run and present the applicant journey

Use fictional data only. Run the commands from your checkout's `development/` directory. On 2026-09-20 the user authorized local integration into `main`; the original `review/phase-2-slices-2-5` worktree remains available with its isolated demo environment. Read [the learning guide](../learning/PHASE-2-IMPLEMENTATION-REVIEW.md) first.

## Start locally

Use Node **24.21.0** from `.nvmrc`, npm 11 or later, PostgreSQL 18 and the committed lockfile. Arch and WSL use the same commands. Choose a dedicated fictional database; do not run resets against an existing shared database.

1. Copy `.env.example` to `.env` only if you do not already have one. Set `DATABASE_URL` to your own local review database. For the fixture demonstration set `DEMO_MODE=true`, `APPLICATION_SCANNER=demo-fixtures`, `API_INTERNAL_URL=http://127.0.0.1:3101` and `PORT=3101`. The web port below is explicitly 3100 to avoid overriding it with the API port.
2. Start your local PostgreSQL service. The existing Compose definition uses port 5432 and container name `sis-postgres-18`; check for an existing service before starting it. This review used an isolated database on port 55432, without modifying the existing service.
3. Install/build shared configuration, deploy migrations to that dedicated database and seed fictional records:

```sh
npm ci
npm run build --workspace=@sis/config
node scripts/with-env.mjs prisma migrate deploy
ALLOW_DEMO_SEED=true node scripts/with-env.mjs node prisma/seed/seed.ts
```

The seed requires explicit permission through `ALLOW_DEMO_SEED`; it creates fictional accounts and programme rules. It does not verify a real person's email. If an older installation already applied the repaired catalogue migration, read the checksum caution in [the earlier-phase review](../learning/PRIOR-PHASE-REVIEW.md) before deploying.

4. In one terminal, start the API:

```sh
node scripts/with-env.mjs npm run start:dev --workspace=apps/api
```

5. In another terminal, start the web app:

```sh
node scripts/with-env.mjs npm run dev --workspace=apps/web -- --port 3100
```

Open `http://127.0.0.1:3100/discover`. Demo credentials are already published fictional fixtures: `bwalya.m` / `Seed-2026-Bwalya`. Keep the same host spelling (`127.0.0.1`) throughout the browser journey. If the account's offering is already submitted, open its receipt; use a fresh isolated test database/account for another complete demonstration. Do not delete immutable submission history to make a demonstration repeatable.

## Ten-minute presentation story

| Time | Show | Explain in your own words |
|---|---|---|
| 0–1 min | Discovery and offering deadline | “The published programme is not an admission promise. Rules and deadlines come from the server.” |
| 1–2 min | Sign in, deliberate Start application, draft overview | “Account identity and application ownership are different. Starting a draft does not submit it.” |
| 2–4 min | Personal/contact/qualification sections | “Valid fields save with a version. A second device cannot silently overwrite a newer version. Account verification cannot be changed in this form.” |
| 4–6 min | Upload `packages/test-fixtures/documents/fictional-result.pdf`, then Check file safety | “Uploaded means quarantined first. This exact fictional PDF is the demo allowlist; it does not prove we deployed a production scanner.” |
| 6–8 min | Review blockers, each declaration, final confirmation, receipt | “The database commits snapshot, audit and handoff together. Submitting twice cannot produce two official submissions.” |
| 8–9 min | Refresh receipt; show browser recovery test and API rollback/concurrency tests | “A lost response does not mean the action failed. We check the saved result instead of creating another submission.” |
| 9–10 min | Source map, pending gates and rotation ledger | “This is slices 2–5, with earlier fixes. Staff assessment, status/clarifications and production approval are later work.” |

For the seeded Software Engineering offering use fictional names, a past birth date, `PORTAL`, ECZ, a fictional awarding institution, a completed prior year and Mathematics/English grades from the displayed list. These are fixture choices, not advice about real eligibility. The fixture intake deadline is fixed; if it has passed, the server must block submission rather than bypass it.

## Demonstrate failure safely

- Enter an impossible date and another valid field; show the valid save and the specific error.
- Type without saving, click another section, cancel the warning and show the entries remain.
- Open the same draft in two tabs. Save in one, then attempt to save the old version in the other. Explain the comparison before choosing which values to keep.
- Replace a document with a reason; show its history and renewed quarantine.
- Use the automated browser test for a dropped final response. It drops only the response after the server has processed submission, then uses Check saved result.
- Show a cross-applicant denial from the API tests. Never demonstrate with real data or another person's account.

## Test commands

Run non-database checks from `development/`:

```sh
npm run scan
npm run test:scripts
npm run lint
npm test
npm run build
npm run typecheck
```

Database tests require an isolated seeded test/review database. The older catalogue tests assume the seed catalogue, so run them before the admissions tests which add synthetic programmes. `DEMO_MODE=true` is needed for the older recovery-token demonstration test; forgetting it correctly returns 404.

```sh
node scripts/with-env.mjs npm run test:e2e --workspace=apps/api -- --exclude '**/applications.e2e-spec.ts' --exclude '**/config-versions.e2e-spec.ts' --no-file-parallelism
node scripts/with-env.mjs npm run test:e2e --workspace=apps/api -- applications.e2e-spec.ts config-versions.e2e-spec.ts --no-file-parallelism
npx playwright install chromium
npm run test:browser
npm run backup:test
```

Use a separate seeded browser test database (name containing `test`, `review`, `ci` or `browser`). Playwright starts production builds on 3100/3101 and creates unique fictional accounts, so repeat runs do not require destructive resets. Set `PORT=3101` and `API_INTERNAL_URL=http://127.0.0.1:3101` for those server processes. Browser tests use the real API/database and exact-fixture adapter; only selected network responses are deliberately interrupted. `backup:test` needs PostgreSQL 18 client tools and permission to create a new scratch database; it restores, reconciles and removes only that scratch database.

Generated HTML reports/traces/screenshots are under `playwright-report/` and `test-results/` (ignored by Git). [VERIFICATION.md](../learning/VERIFICATION.md) records the checked evidence. Do not treat the existence of a test file as proof it was run.

## Human review record — leave unchecked until actually done

- [ ] Charles runs the complete story and explains controller/service/database boundaries.
- [ ] Chitindu reproduces on WSL and explains ownership, versions and command replay.
- [ ] Both draw the save/submit sequence without reading the code.
- [ ] Both explain why scan, readability and qualification verification are different.
- [ ] Keyboard-only, 200–400% zoom, screen-reader labels/errors and slow-network recovery are reviewed.
- [ ] Independent human checks the source-to-code map and named production gaps.
- [ ] Remote CI/branch settings and migration history are reviewed before deployment or a release claim. The 2026-09-20 local Git integration was explicitly authorized by the user; these checks remain pending.

Questions to practise: What stops another applicant reading this draft? Why is a disabled button insufficient? What if the fee policy changes after saving? What if the server commits but the internet disconnects? Why is the outbox event not proof of delivered email? Which approval or provider must exist before this demo becomes a production workflow?

## Existing review environment on this machine

The isolated review container is named `sis-phase2-review-tests`; it retains only fictional verification data and listens on loopback 55432 when started. It is stopped at handoff. To reuse that environment, run `docker start sis-phase2-review-tests`, then use the worktree's existing ignored `.env` and the two application start commands above. `sis_phase2_review` contains API fixtures; `sis_browser_review` contains browser fixtures. Do not confuse these with the separate existing `sis-postgres-18` service on 5432. Nothing in this guide authorizes resetting that service.
