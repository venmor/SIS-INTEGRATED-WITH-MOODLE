# Rate Limiting, Abuse Prevention, Resilience and Recovery

## Rate-limit baseline

Limits are versioned configuration and reviewed using measured traffic. Initial demonstration guidance:

| Operation | Baseline control |
|---|---|
| Login | 5 failed attempts per account/IP per 15 minutes, progressive delay |
| Password reset | 3 requests per account/IP per hour |
| Public application submission | 5 per IP per hour plus idempotency/duplicate detection |
| Document upload | Size/type/count and daily user quota |
| Search | 60 requests per authenticated user per minute |
| Ordinary API | 120 requests per authenticated user per minute |
| High-impact command | Lower action-specific limit plus idempotency key |
| Provider callback | Signature/authentication, replay detection, idempotency and bounded processing |

Rate limiting complements authorization and database constraints; it cannot replace them. Responses must avoid enabling account enumeration.

## Idempotency

Application submission, registration confirmation, payment callback, refund, result release, award confirmation and integration replay require a stable idempotency reference and authoritative uniqueness constraint. A repeated request returns the prior outcome rather than applying the effect again.

## Provider/worker recovery

Each external interaction defines timeout, retryable/non-retryable errors, exponential backoff with jitter, maximum attempts, dead-letter state, approved manual replay, idempotency and reconciliation query. A notification/provider failure cannot undo the originating domain decision.

## Redundancy model

| Area | Project baseline | Production extension |
|---|---|---|
| Web/API | Stateless/restart-safe design | Multiple instances behind load balancer |
| PostgreSQL | Automated backup and restore exercise | Managed standby/failover |
| Documents | Durable backup and integrity checks | Replication/versioning |
| Workers | Persistent outbox and resumable attempts | Multiple coordinated workers |
| Deployment | Previous release redeployment | Rolling/blue-green deployment |
| Monitoring | Health checks, structured errors, correlation | Alerts, uptime and capacity monitoring |

The presentation must not claim hosting redundancy that has not been deployed and tested.

## Backup and recovery

- Back up database and document storage on an approved schedule.
- Encrypt and restrict backups.
- Test restore at least once per completed phase and before presentation release.
- Record backup source, restoration target, executor, duration and reconciliation result.
- Prefer forward-safe fixes for migrations; never delete official records merely to make a deployment pass.

## Minimum failure scenarios

- Refresh/double-click during formal submission
- Connection loss after command acceptance
- Duplicate/delayed provider callback
- Partial import or grade-transfer failure
- Dead-letter and approved replay
- Stale report/metric
- Concurrent update conflict
- Role/credential expiry during action
- Failed deployment and rollback
- Backup restore and reconciliation
- Moodle outage during registration
- Payment reversal after clearance
- Result amendment after progression/graduation evaluation
- Failed notification and regulatory acknowledgement

## Incident lifecycle

An incident records detection, affected journeys/data, severity, containment, root cause, recovery, reconciliation evidence, preventive action, owner and linked release/PR. It closes only after recovery evidence, not merely after service restart.
