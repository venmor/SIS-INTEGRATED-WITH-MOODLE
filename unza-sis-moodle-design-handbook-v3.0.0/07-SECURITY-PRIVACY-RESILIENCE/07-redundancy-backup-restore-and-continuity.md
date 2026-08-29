# Redundancy, Backup, Restore and Continuity

## Design levels

The student project begins with reproducible containers and backups, not expensive production clusters. The architecture remains ready for higher availability without pretending the presentation environment is redundant.

| Stage | Minimum continuity control |
|---|---|
| Local development | Rebuild from repository, migrations and synthetic seed; no laptop is the only data source |
| CI/test | Fresh isolated database and repeatable test fixtures |
| Demo/staging | Automated backup, documented restore, health checks and resettable demo data |
| Production candidate | Separate failure domains where approved, managed database durability, object versioning, monitored backups and tested restore objectives |

## Backup rules

- Define what is backed up: database, document objects, configuration versions and required audit metadata.
- Encrypt and restrict backup access.
- Retain according to approved schedule; test restoration regularly.
- Record recovery point/time objectives only after infrastructure and institutional approval.
- A successful backup job is not proof; a restore and business reconciliation are required.

## Restore workflow

1. Declare incident and stop unsafe writes where needed.
2. Identify approved recovery point and affected integrations.
3. Restore into a controlled environment.
4. Validate schema/configuration compatibility and record counts.
5. Reconcile payments, Moodle events, result releases and notifications around the recovery window.
6. Obtain domain-owner sign-off for critical records.
7. Resume service, monitor and record evidence/lessons.
