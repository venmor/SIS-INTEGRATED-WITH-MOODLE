# Native execution ledger — plan: development/docs/superpowers/plans/2026-09-23-admissions-staff-ui-modernization.md

Execution branch: `ui-modernization`

Baseline: public/applicant slice closed at `d02d0e8`; CI run 35836155766 passed and both Vercel projects were green.

User constraint: routine staff UI copy stays short and direct. Structure, status, labels and placement carry meaning before prose.

Ruling: CI remains the executable RED→GREEN environment because the sandbox cannot clone the repository. Batch the admissions semantic contracts into a serial Playwright suite that creates one submitted application, then verifies queue, reviewer, approver and history contracts in separate named tests. Cost if wrong: shared database state could make a later test depend on an earlier action; the suite is explicitly serial and each role signs in independently.


RED run 35837079249: pre-browser gates passed; admissions setup failed before new contracts because the test captured the application URL before the Start application redirect completed.
Test setup ruling: wait for the existing `Application overview` heading before storing the application URL, matching the established applicant browser journeys. Cost if wrong: a future flow that no longer lands on the overview would require a new stable readiness signal.


Corrected RED run 35837679129: setup passed and the queue contract failed at missing `Active filters`, with all pre-browser gates green.

Task 1: complete — queue state/filter hierarchy implemented. Follow-up fixes retained the existing result-status contract and removed an event-handler type regression. The queue contract passed before later tasks advanced.

Task 2: complete — run 35839084089 reached the reviewer case and failed at missing `Case summary`; `c755360` added the governed summary with reference, programme/intake, state, open work and policy/requirement versions.

Task 3: complete — run 35839650143 failed at missing `Evidence review`; `d34fce7` replaced raw declaration lists with structured Personal, Contact, Qualifications and Documents evidence groups. Existing Phase-3 journey expectation was updated to the approved heading.

Regression ruling: the case summary duplicated the phrase `Decision released.` after a successful release, colliding with the success notice. `09fd3c1` changed the summary next-step text while leaving the success confirmation as the single release message.

Task 4/5 RED: run 35840058645 passed the evidence heading then failed at missing reviewer `Findings` region. `04c90a1` introduced active-role rendering from `/auth/me`: officers receive Findings, Clarification and editable Recommendation work; approvers receive read-only evidence/recommendation plus Decision controls. Backend authorization remained unchanged.

Test ruling: once the Recommendation region existed, unscoped `getByLabel("Recommendation")` became ambiguous with the form control. The tests were corrected to scope the control through `Record a recommendation`; product accessibility structure was retained.

Task 6: complete — `9ff5aec` converted staff history into a labelled vertical timeline and made pending correction decisions reviewer-only. Routine `Newest first...` guidance was removed because chronology/visibility are expressed by structure and labels.

Task 7: complete — `ui-admissions-workspace.visual.spec.ts` captures 1440px and 390px queue evidence, reviewer case, and approver decision case. It also asserts no horizontal overflow, no page-level gradients, visible staff navigation and role-appropriate action visibility.

Final verification: GitHub CI run 35841393643 passed source scan, lint, 68 unit tests, migrations/seed, 148 primary API e2e tests, 19 applications/config e2e tests, production build, typecheck and the complete browser suite. Browser evidence artifact: 10740979093.

Final self-review: no Critical or Important findings. Changed admissions surfaces contain no gradients, glass/blur effects or decorative dashboard metrics. Routine copy is short; longer text remains only where authority/consequence requires it. Reviewer and approver controls are separated in the UI and remain backend-enforced. Mobile queue/case tests assert no horizontal overflow.

Vercel note: the final commits were not rebuilt by Vercel because both projects returned the platform `build-rate-limit` status, not a compilation/deployment error. The same product code passed the repository production build and full CI at `f8836cd22b21d3aed2df56bca6499829106c84cc`.
