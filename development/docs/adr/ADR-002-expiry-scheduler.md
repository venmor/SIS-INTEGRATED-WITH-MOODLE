# ADR-002: Expiry scheduling via @nestjs/schedule (in-process)

- Status: Approved
- Date: 2026-09-17
- Decision owners: Lead Charles / Reviewer Chitindu Milimbo
- Affected requirement/module/release: TASK-PH1-005 (expiry daemon) / identity-access / v0.2.0 Phase 1 slice 5

## Context

TASK-PH1-005 permits `node-cron` for the expiry daemon and expects an
`expiry-daemon.mjs` worker process; the packet DoD also says "no new deps".
The slice needs: per-tick config refresh (`security.expiryCheckIntervalMinutes`
without restart), DI-managed lifecycle, deterministic tests, graceful
shutdown, and zero new external services (AGENTS.md forbids Redis/Kafka
without ADR).

## 19.46 five questions

1. Requirement: periodic, config-driven revocation ticks with observability
   (`ExpiryDaemonState`) and idempotent replay proofs.
2. Platform alternative: raw `setInterval` needs zero deps but freezes the
   interval at boot, drifts, hand-rolls overlap guards, and has the weakest
   shutdown story. `node-cron` (packet-literal) needs manual DI wiring,
   manual stop, and tests worse with fake timers. Neither integrates with
   NestJS lifecycle/testing.
3. Maintenance: `@nestjs/schedule@12.0.2` (peer `^11 || ^12`, matches our
   Nest 12) + transitive `cron@4.4.0`, both actively maintained, types
   included, `npm audit` clean (only pre-existing Prisma/mysql2 advisories).
4. Owner: Lead Charles; removal path: delete `ScheduleModule.forRoot()`,
   revert `ExpiryDaemonService` to a plain provider, drop the two packages.
5. Removal cost: low (one module line + one service rewrite, both covered
   by `test/expiry-scheduler.e2e-spec.ts` + `test/expiry-daemon.e2e-spec.ts`).

## Decision

`@nestjs/schedule` (`ScheduleModule.forRoot()` + `SchedulerRegistry` +
`CronJob`) drives `ExpiryDaemonService` with `resyncSchedule()` re-reading
config per sync. No separate process, no cross-module writes, no new
services — the packet's in-process boundary is preserved.

## Consequences

Benefits: constructor DI, `@nestjs/testing` mocks, `enableShutdownHooks`
shutdown, per-tick config refresh, single observability point. Costs: two
new packages in the lockfile (deviation from packet "no new deps" recorded
in TASK-PH1-005 evidence and NOTE-PH1-005-FIXES.md).

## Verification and reversal

Verify: `test/expiry-scheduler.e2e-spec.ts` (registration + reschedule),
`test/expiry-daemon.e2e-spec.ts` (revoke + idempotency), `npm audit`
clean for new packages. Reverse by new ADR — never silent edit.

## Vercel hosting addendum (2026-09-20)

This decision assumes a continuously running NestJS process. A Vercel function
is request-started and may stop between requests, so the demonstration API
does not start the in-process expiry job when `VERCEL` is set. Local and other
long-running deployments retain the approved scheduler unchanged.

This is an operational boundary, not a replacement scheduler. A future
production Vercel deployment needs an approved, authenticated Vercel Cron
route or worker, its ownership and monitoring evidence, and separate tests
before it can claim automatic expiry execution.
