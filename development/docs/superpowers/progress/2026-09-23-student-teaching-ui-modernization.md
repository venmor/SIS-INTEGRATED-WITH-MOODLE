# Native execution ledger — plan: development/docs/superpowers/plans/2026-09-23-student-teaching-ui-modernization.md

Execution branch: `ui-modernization`

Baseline: plan commit `9b6f93c`; CI run 35842374773 passed.

Ruling: this harness exposes the repository through the GitHub connector rather than a local git checkout, so no local worktree or `.superpowers/sdd` workspace can be created or executed. Continue on the already isolated `ui-modernization` branch, keep durable execution state in this repository ledger, and use GitHub CI as the executable verification environment. Cost if wrong: less local isolation, mitigated by branch isolation, atomic commits and full CI on every gate.

Pre-flight shared interfaces: Tasks 2–5 consume the fictional preview records produced by Task 1; names and fields match the plan. Task 6 consumes all preview routes and shared preview styling produced by Tasks 1–5; no conflict found.

Ruling: batch Tasks 1–5 semantic contracts into one serial Playwright suite. The suite stops after the first failing task contract, so each implementation exposes the next RED in order while reducing duplicate full-CI runs. Cost if wrong: a later contract could be masked by an earlier unexpected failure; serial ordering and per-task CI log review make that visible before implementation proceeds.


Task 1 RED: CI run 35863529775 passed all non-browser gates, then the serial preview suite failed at missing `Design preview` status on `/design-preview`; Tasks 2–5 were skipped as intended.


Task 1: complete — CI run 35864161238 passed the preview-boundary contract after `55f671a`; all non-browser gates remained green. The serial suite then failed at Task 2 because `Student portal · January 2027 · 202700123` was absent.
Task 2 RED: run 35864161238 failed at the missing Student Home context line; Tasks 3–5 were skipped as intended.


Task 2: complete — CI run 35864818047 passed the Student Home contract at 390px, including the required section order, SIS registration state, Moodle learning-access state and overflow check. All pre-browser gates remained green.
Task 3 RED: run 35864818047 then failed because the `Registration readiness` heading was absent; Tasks 4–5 were skipped as intended.


Task 3: complete — CI run 35865437090 passed the read-only Registration Readiness contract at 390px, including owner/state labels, zero buttons and overflow check. All pre-browser gates remained green.
Task 4 RED: run 35865437090 then failed because the Teaching Workspace context line was absent; Task 5 was skipped as intended.


Task 4 ruling: run 35866042685 reached the Teaching Home contract but `getByText("CSC 4792")` was ambiguous because the same course code correctly appears in the urgent action, course heading and recent work. Keep the repeated course context and scope the contract to the course heading. Cost if wrong: the contract becomes slightly more structure-specific, but it still tests the handbook's current-course record.


Task 4 selector ruling: run 35866678337 confirmed the course heading selector but `4 TG groups` was also intentionally repeated in the integration notice. Scope that assertion to the current-course record; do not remove useful synchronization context. Cost if wrong: the contract is more tightly bound to the current-course grouping, which is the behavior it intends to verify.


Task 4: complete — CI run 35867174426 passed the teaching-home contract at 390px after scoping repeated course/TG-group text to the current-course record.
Task 5 RED: the same run then failed because the course workspace context `CSC 4792 · January 2027 · Lecturer · Course-wide` was absent. This confirms the course preview is the next missing behavior.


Task 6 ruling: Task 5's full CI run is long-running at the browser stage. Add the Task 6 screenshot-evidence test while that run remains active, but make no further production changes and do not mark Task 5 complete until its original semantic run is green. Cost if wrong: the evidence commit may start a second CI run before Task 5's run finishes; no product behavior is changed by this ruling.
