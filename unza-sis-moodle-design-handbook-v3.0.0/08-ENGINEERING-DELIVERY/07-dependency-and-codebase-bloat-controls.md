# Codebase Health and Anti-Bloat Rules

## Principle

Start simple without starting messy. A future AI agent may not introduce abstraction, package or infrastructure merely because it is common in other projects.

## Controls

- One approved component style per purpose.
- No duplicate permission, date, money, status or validation logic.
- No direct cross-module writes.
- No speculative microservice, cache, queue or feature flag.
- No unused generated files, dead code or abandoned experiments.
- Paginate queues; query required fields; measure before caching.
- Review dependencies, duplicated logic, database indexes, migrations and feature flags after every release family.
- Record technical debt with owner, effect and target release.
- Refactoring must preserve behaviour and include regression evidence.

## AI-specific review questions

- Did the agent copy an existing type/component rather than reuse its contract?
- Did it create a generic abstraction used once?
- Did it place business policy in UI/controller code?
- Did it add an unapproved package or pattern?
- Did it omit denial, error or recovery behaviour?
- Can both developers explain every generated file and dependency?
