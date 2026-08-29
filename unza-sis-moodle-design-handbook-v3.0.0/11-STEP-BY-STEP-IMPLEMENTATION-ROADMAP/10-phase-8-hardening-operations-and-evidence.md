# Step 9 — Phase 8: Hardening, Operations and Evidence

**Release target:** v0.9.0

## User/system outcome

The connected MVP has reliable notifications, audit timeline, incident/reconciliation operations, accessibility, security, backup/restore and presentation evidence.

## Read before planning

- Security/resilience folder
- Operations journey
- Testing/acceptance folder
- Demo/presentation folder
- Definition of done

## Learning goals

- Threat modelling
- Observability and incident response
- Accessibility testing
- Backup/restore and reconciliation
- Release/rollback

## Ordered delivery slices

1. Notification record/delivery status
2. Cross-domain audit timeline
3. Operations health and incident queue
4. Rate-limit/abuse tuning
5. Accessibility/performance/low-bandwidth fixes
6. Backup/restore rehearsal
7. Demo reset and evidence capture

## Security, integrity and recovery focus

- Threat review of every MVP entry point
- Secret/log/privacy scan
- Privileged access review
- Restore reconciliation
- Dependency vulnerability decision

## Required proof

- Full connected E2E stories
- Authorization regression suite
- Accessibility critical journeys
- Load/rate-limit and intermittent network
- Backup restore plus payment/Moodle/result reconciliation
- Failed deployment rollback rehearsal

## Team rotation and documentation

Rotate responsibility by hardening area. Each developer must lead one incident/recovery drill and review the other’s threat model and accessibility evidence.

## Demonstration checkpoint

Show CI, audit timeline, deliberate integration failure, incident handling, restore/reconciliation evidence and accessibility completion.

## Exit gate

- No critical release-blocking test failure
- Demo reset is deterministic
- Known limitations documented
- Release candidate and rollback reference created
