# V2 academic-support request and adviser reply — 2026-10-02

This is a synthetic academic-help journey under [TASK-V2-SUPPORT-001](../task-packets/TASK-V2-SUPPORT-001.md). It does not activate a university counselling or student-success service. [GAP-V2-002](../gaps/GAP-V2-002-student-support-routing-and-ownership.md) remains open.

The student page resolves an effective-dated adviser relationship and a named, demo-only academic service for the student's active programme and campus. It displays the receiver before submission. With no unique live route, submission is unavailable and the page gives an honest next step. A successful request creates the case, owner, event and audit in one transaction; idempotency makes an uncertain retry safe. The student sees their own history and messages. The selected adviser appointment sees only assigned cases and can reply in the same secure portal. A student can answer there. A technical administrator has no support-content bypass. Category, optional narrative and portal contact stay separate from counselling/disability/welfare/discipline records.

The student and adviser screens use the semantic Tailwind layer from [ADR-003](../adr/ADR-003-tailwind-ui-layer.md): task-first headings, readable forms, status chips, responsive case cards, visible pending state and reduced-motion-aware feedback. The queue and history use bounded cursor paging. At 390px, the connected browser journey has no horizontal overflow. This is a focused screen-family increment, not a completed SIS-wide visual review.

## Evidence

- Prisma validation and migrations on isolated synthetic `sis_v2_review_20261002`; API TypeScript/build passed.
- Focused academic-support API e2e: 4 passed, covering no/expired route, demo-off and wrong relationship denial, owner visibility, idempotent request/reply, event and audit persistence.
- Connected Playwright academic-support story: 2 passed, including unavailable route and student → adviser → student secure conversation at 390px.
- Web production build and web/API lint exited 0 after the presentation polish. API lint retains warnings in unrelated existing files. `git diff --check` exited 0.

## Remaining limits

No real university owner, service hours, contact number, response target, notification delivery, reassignment, appointment booking, retention schedule or confidential support custody has been approved. The current adviser must visit the assigned queue; there is no external message. There is no automatic risk signal, counselling referral or emergency response. Production request activation stays closed until the institution approves those inputs and role/scoping, privacy, recovery and operational tests pass.
