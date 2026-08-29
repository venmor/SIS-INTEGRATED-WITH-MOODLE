# Architecture, Data, Security and Integration

The implementation baseline is a TypeScript modular monolith: Next.js and CSS Modules for the web experience, NestJS for APIs and domain workflows, PostgreSQL for transactional records and Prisma for typed access and migrations. These are logical boundaries in one initial deployment, not premature microservices.

Each domain module owns its records and rules. Cross-domain behaviour uses published application services, commands, queries and events. External effects use an outbox and adapters with authentication isolation, timeouts, retries, idempotency, normalized results, error masking and reconciliation.

Security is layered: secure authentication and session management; server-side authorization; least privilege; separation of duties; safe file handling; rate limiting by route, identity and risk; input validation; secrets isolation; immutable audit; privacy classification; backup/restore tests; and incident response. Redundancy is designed according to service criticality, while the presentation environment remains intentionally simple and reproducible.

Policy, workflows, roles, approvals, metrics, integration mappings and retention rules are effective-dated configuration. Official records are never silently overwritten.
