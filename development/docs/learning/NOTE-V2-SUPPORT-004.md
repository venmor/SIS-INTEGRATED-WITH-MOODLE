# Assigned academic follow-up worklist — 2026-10-03

[TASK-V2-SUPPORT-004](../task-packets/TASK-V2-SUPPORT-004.md) connects the student/adviser action from SUPPORT-003 to a bounded adviser worklist. The adviser can see all open actions, those past their chosen target date, or student completion claims awaiting confirmation. Rows are ordered by target date and include the student, case reference, action, next actor and direct case route. The page keeps the filter across pages and works at 390px.

The API rechecks the selected, effective adviser appointment and programme scope. Its SQL predicate constrains actions through the owning request before pagination, and a cursor must still belong to that appointment and filter. It returns at most 50 rows; an index supports status/target-date traversal. It does not infer a student-risk score or treat a target date as an approved service deadline. No reminder, delivery claim, supervisor disclosure or automatic escalation is generated. [GAP-V2-002](../gaps/GAP-V2-002-student-support-routing-and-ownership.md) continues to block live activation.

The first focused API test was red at the new route before implementation. Verification evidence and limits are in [VERIFICATION](VERIFICATION.md). The migration was applied only to the isolated synthetic review database. No provider call or download occurred.
