# Architecture and Project Defence Question Bank

## High level

- What problem does the system solve beyond replacing forms?
- Why is the SIS authoritative and Moodle not?
- Why a modular monolith rather than microservices?
- How are institutional policy differences handled?
- What exactly is included in the presentation MVP?

## User experience

- How does a person with several roles get the correct interface?
- How do you prevent the site from feeling generic/AI-generated?
- What happens when a form, payment or Moodle request is uncertain?
- How are counselling and other restricted records protected?

## Technical

- Trace one action from button to database/event/audit.
- How does idempotency prevent duplicates?
- How do outbox and reconciliation differ from a direct API call?
- How are migrations, APIs, events, configuration and releases versioned?
- What is the purpose of CI/CD and protected pull requests?

## Security/resilience

- Authentication versus authorization?
- How are role, scope, relationship and state checked?
- Where is rate limiting applied and how is legitimate work protected?
- How would you restore and reconcile after data loss?
- What can a system administrator not do?

## Team and AI

- How did Charles and Chitindu both learn the full stack?
- How do AI agents avoid forgetting project patterns?
- What do you do when AI proposes an unapproved feature?
- What evidence proves that generated code is understood and safe?

Prepare answers using the seven-layer explanation model and one concrete demonstration example.
