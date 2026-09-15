# Learning Note — TASK-PH1-001

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-15 / v0.2.0 Phase 1 slice 1

## What we built and why

Identity data foundation: 5 tables + fictional 4-person seed + one-command
reset, so slices 2–6 authenticate against real rows instead of imagination.

## Frontend explanation

No UI change.

## Backend/domain explanation

No API yet. Ownership set: identity-access owns these tables; later slices add
routes, never another module's writes.

## Database/migration explanation

- Person (authoritative id) → Account (username UNIQUE login handle, argon2id
  hash, status) → RoleAssignment (role/scope/dates/issuer/reason/revocation) →
  Session (token hash UNIQUE, expiry, revocation, device hints) → AuditEvent
  (append-only fields; no update/delete path).
- Scope refs are plain strings until curriculum tables land (documented limit).
- Migration `20260915014353_ph1_identity_core` committed with code (19.33).

## Security and authorization explanation

Usernames unique at DB level (P2002 proven); passwords only as argon2id hashes
(verify proven true); sessions keyed by sha256 token hashes; seed passwords are
fictional demo pattern, never printed. Enforcement logic arrives slices 4–5.

## Tests and what they prove

Empty-DB `demo:reset` (migrate deploy + seed: 4/4/6) · re-seed idempotent
(4/4/6 stable) · duplicate username → P2002 · expired TUT row present ·
argon2 verify true · secret scan clean.

## What failed or confused us

1. ESM named imports fail for CJS `@prisma/client`/`argon2` under type
   stripping → `createRequire` interop (erasable, no dep).
2. Fresh `npm ci` drops the generated client → root `postinstall: prisma
   generate` + explicit generate in `demo:reset`.
3. Prisma 7 needs a driver adapter → `@prisma/adapter-pg` + `pg` added;
   `new PrismaClient({ adapter })` everywhere from now on.

## Terms/concepts learned

- Person vs Account vs RoleAssignment (§12.8); natural-key upserts; P2002;
  argon2id; adapter pattern; type stripping limits.

## Questions to revise before presentation

1. Why is username not the person identifier? 2. How is expiry derived vs
revocation recorded? 3. Why is audit append-only? 4. What does `demo:reset`
destroy, and why is that safe?
