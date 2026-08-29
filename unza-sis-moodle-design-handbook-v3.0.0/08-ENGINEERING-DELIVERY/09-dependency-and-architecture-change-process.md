# Dependency and Architecture Change Process

Before adding a package, service, database, queue or framework, document:

1. The problem that existing tools cannot reasonably solve
2. Ownership and maintenance cost
3. Security/privacy/data implications
4. Cross-platform and CI impact
5. Bundle/runtime/deployment impact
6. Alternatives considered
7. Removal/rollback path
8. Human approval through an ADR

Dependencies are pinned by the lockfile and reviewed in PRs. Duplicate libraries for the same responsibility are rejected. Deprecated/unused modules, endpoints, flags and configuration are removed only through a tested cleanup task.

The excluded initial technologies—Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile and AI chatbot—remain excluded until a concrete approved need justifies them.
