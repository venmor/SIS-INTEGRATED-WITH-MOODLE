# Authorization and Security Test Guide

For every sensitive action, test allowed and denied combinations of identity, active role, organization, assignment/relationship, record state, purpose, consent/policy and authority time.

| Scenario | Expected result |
|---|---|
| Applicant reads own draft | Allowed |
| Applicant guesses another application ID | Denied with no existence disclosure |
| Lecturer opens assigned course/TG | Allowed |
| Lecturer changes official released result | Denied and audited |
| Adviser opens assigned advisee | Allowed minimum academic/support view |
| Adviser searches unrelated student | Denied/no existence disclosure |
| Dean reviews a referred school decision | Allowed in appointment scope |
| Dean browses counselling notes | Denied and audited |
| Counsellor opens assigned case | Allowed restricted view |
| Counsellor opens unassigned case | Denied and audited |
| Finance officer reconciles assigned transaction | Allowed |
| Finance officer manually toggles clearance | Denied; policy calculation required |
| QAO verifies own evidence where independence is required | Conflict route/denied |
| System administrator edits result/payment | Denied |
| Expired/delegated role exceeds scope | Denied |
| Regulatory user submits without signatory authority | Denied |

Also test account enumeration, session fixation/expiry, CSRF, input validation, file safety, rate limiting, secret/log exposure, export limits and break-glass review.
