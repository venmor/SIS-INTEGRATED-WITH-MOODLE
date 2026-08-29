# Step 2 — Phase 1: Identity and Scoped Access

**Release target:** v0.2.0

## User/system outcome

A fictional user can securely sign in, recover access, hold several effective-dated roles, deliberately switch workspace and be denied outside scope.

## Read before planning

- Design Sections 1–2 and 10
- Applicant account/security journey
- System/IAM operations journey
- Permission matrices
- Security acceptance gates

## Learning goals

- Authentication vs authorization
- Password hashing/session cookies/CSRF
- NestJS guards and policy checks
- Person/account/role/appointment separation

## Ordered delivery slices

1. Person/account and verification model
2. Secure sign-in/session/sign-out and recovery
3. Role assignment, scope and active workspace
4. Server-side permission policy and denial behaviour
5. Access audit and expiry/revocation

## Security, integrity and recovery focus

- Argon2 or approved strong password hashing
- HTTP-only secure cookie/session protections
- Rate limits for sign-in/verification/recovery
- No existence disclosure
- Time-bound privileged roles

## Required proof

- Successful and failed authentication
- Account enumeration and rate-limit tests
- Role/scope/relationship denial tests
- Session expiry/shared-device tests
- Keyboard/screen-reader authentication flow

## Team rotation and documentation

Lead implements identity end to end; reviewer threat-models it, adds denial/recovery tests and explains the permission decision path. Swap on workspace/role assignment.

## Demonstration checkpoint

One person switches from Lecturer to Dean workspace; an unrelated student lookup is denied and audited.

## Exit gate

- No route trusts client-only role state
- All sensitive endpoints have denial tests
- Recovery does not weaken identity proof
- Both developers explain session and authorization flow
