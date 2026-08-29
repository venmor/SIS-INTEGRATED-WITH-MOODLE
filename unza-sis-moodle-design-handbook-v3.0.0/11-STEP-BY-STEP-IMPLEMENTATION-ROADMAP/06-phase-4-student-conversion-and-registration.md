# Step 5 — Phase 4: Student Conversion and Registration

**Release target:** v0.5.0

## User/system outcome

An accepted applicant becomes a unique student through controlled onboarding and completes a policy-validated academic registration with a clear receipt.

## Read before planning

- Student Journey Book Parts 1–3
- Design Sections 3–4 and 6
- Administrative Operations Blueprint
- Data/configuration and state contracts

## Learning goals

- Relational modelling and unique constraints
- Transactions/concurrency
- Effective-dated curriculum and academic period
- Configurable prerequisite/progression rules

## Ordered delivery slices

1. Onboarding checklist and identity uniqueness
2. Student/programme attempt/curriculum conversion
3. Registration eligibility summary
4. Course selection and validation
5. Formal registration and immutable snapshot
6. Add/drop/exception task skeleton where MVP requires

## Security, integrity and recovery focus

- Own-student self-service
- Authorized registry correction route
- No direct cross-module writes
- Concurrent submission/version checks

## Required proof

- Duplicate person/student conversion
- Ineligible/prerequisite/capacity/period denial
- Concurrent registration submission
- Policy version boundary cases
- Registration receipt/audit and mobile completion

## Team rotation and documentation

One developer leads conversion/data integrity; the other leads registration policy/UI. Each reviews the other’s transaction and denial tests.

## Demonstration checkpoint

Accepted applicant receives a student number, sees explainable course eligibility and submits one official registration snapshot.

## Exit gate

- Application/offer/student/registration remain distinct records
- Policy values are configured
- Official snapshot/version/audit proven
- No Moodle access is assumed before integration phase
