# TASK-V2-APP-002 — Explain applicant result and upload blockers

- Release: v2.0 applicant usability repair. Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending.
- Authority: [Phase 2 application packet](TASK-PH2-004.md), exact Applicant Blueprint Part 6 §§2–3, 9, 11; cross-blueprint `UI-FLOW-001`, `UI-UPLOAD-001/002`, `UI-REVIEW-001`; SUP-009/010/012. Preserve applicant ownership, safety quarantine, versioning, formal assessment and audit.
- Trigger: the isolated fictional `bwalya.m` Radiography draft reports “Science subject” missing despite the results selector offering “Science,” and a latest qualification document remains in `SecurityScanPending`. The review page names both, but the first requirement is impossible to clear through the selectable value and the pending document message does not say what the local exact-fixture scanner accepts.
- Scope: resolve the published `<subject> subject` label to its exact configured subject option for application completeness; fail closed if no configured option matches. Show the missing result in the qualifications step. When a document remains pending under the explicit local demo scanner, explain the fictional practice PDF and the `Check file safety` action in the review blocker. Keep all current documents and declared results intact.
- Exclusions: no real applicant data, automatic grade equivalence, group-of-sciences rule, eligibility decision, file-safety bypass, document verification, scanner replacement, programme-rule rewrite or direct mutation of Bwalya's draft.

## Acceptance

1. A synthetic programme requiring “Science subject” recognizes a declared selectable “Science” result; unrelated subjects do not satisfy it. An unresolvable subject rule blocks submission with a configuration issue rather than an impossible instruction.
2. Qualifications displays the current server-owned blockers before the form. Review links lead back to the affected step. A pending local demo file says to check safety and, if needed, replace with the fictional practice PDF.
3. Focused API tests run red then green; connected mobile applicant browser journey, production builds, lint, source scan and diff integrity pass on an isolated synthetic database. Formal human review remains separate.
