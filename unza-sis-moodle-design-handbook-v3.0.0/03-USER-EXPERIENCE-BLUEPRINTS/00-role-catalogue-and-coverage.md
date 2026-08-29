# Role Blueprints

> **Coverage notice:** This is the compact role catalogue. Detailed standalone and composite journey books for every role family are in this folder. Composite books cite their approved source records and still require task-level authority/policy confirmation.

## Shared role rule

Every role blueprint states purpose, permitted scope, primary tasks, prohibited access, decisions, evidence and recovery. Possessing a technical permission does not automatically place an irrelevant menu item in the active workspace.

## ROLE-PUB — Public visitor

- Discovers programmes, entry guidance, dates and support contacts.
- Sees public information only; cannot infer applicant/student existence.
- May begin account creation through a protected registration flow.

## ROLE-APP — Applicant

- Owns their draft, evidence submissions, declarations and offer response.
- Sees section completeness, submission receipt, current state, reason and next step.
- Cannot edit a formally submitted version; permitted corrections create controlled follow-up evidence.
- Cannot see reviewer notes, internal recommendations or another applicant.

## ROLE-STU — Student

- Views own authoritative profile, programme, study plan, course selection, registration, balances, released results, requests and notifications.
- May submit permitted requests and evidence but cannot directly change official records, clearance or results.
- Receives plain-language status and recovery routes.

## ROLE-LEC — Lecturer

- Sees assigned course offerings, teaching groups, assessment plan and enrolled students in scope.
- Enters/stages marks only where assigned authority permits.
- Cannot release official results or search unrelated students.

## ROLE-TUT — Tutor

- Sees assigned Tutorial Groups and activities.
- May manage only explicitly delegated activities (for example, configured quiz marking authority).
- Cannot inherit the full lecturer or examination role.

## ROLE-ADV — Academic adviser

- Sees assigned advisees, academic indicators, outreach tasks and student responses needed for advising.
- Cannot browse unrelated students or see private counselling/disability notes.
- Records academic outreach, not clinical conclusions.

## ROLE-ADM-OFF — Admissions officer

- Works an assigned application/evidence queue.
- Reviews against the effective criteria version, records evidence findings and makes permitted recommendations.
- Cannot alter applicant-submitted evidence or approve their own recommendation when separation is configured.

## ROLE-ADM-APP — Admissions approver

- Reviews complete decision packages, conflicts and evidence provenance.
- Approves, returns or rejects within delegated scope and preserves reasons.

## ROLE-REG — Registry/student-records officer

- Maintains authoritative student records, corrections, status and registration exceptions within scope.
- Cannot change payments or bypass examinations release authority.

## ROLE-EXAM — Examinations officer

- Validates result packages, missing marks, rules and board readiness.
- Controls staging/validation processes but releases only with explicit authority.
- Cannot rewrite released results; amendments create new versions.

## ROLE-FIN — Finance officer

- Reviews charges, payments, allocation, sponsorship, disputes and reconciliation in assigned scope.
- May not decide academic eligibility or manually toggle clearance outside an authorized adjustment workflow.

## ROLE-SUP — Counsellor/disability/welfare officer

- Works assigned restricted cases and minimum necessary student information.
- Records consent, plans and disclosures according to support policy.
- Private notes remain outside general student and academic workspaces.

## ROLE-DISC — Discipline/safeguarding authority

- Works formally assigned cases under specialized confidentiality and approval rules.
- Access does not arise merely from academic seniority.

## ROLE-QAO — Quality assurance officer

- Creates review scopes, evaluates evidence, proposes findings and monitors action.
- Cannot independently verify their own submitted evidence where conflict rules apply.

## ROLE-DEAN — Dean/academic leader

- Sees decision packages, risks, trends and actions within faculty scope.
- Does not receive unrestricted operational or restricted support records.
- Exercises only configured approval/signatory powers.

## ROLE-REGULATORY — Reporting/regulatory user

- Builds certified report/submission packages from governed metrics.
- Cannot correct source records; routes discrepancies to owning domains.
- Submission requires configured signatory authority and acknowledgement evidence.

## ROLE-INTEGRATION — Integration support

- Views technical delivery, mapping, retry, dead-letter and reconciliation details.
- Can safely replay approved events.
- Cannot modify the academic, finance, admissions or support decision within the payload.

## ROLE-SYSADMIN — System administrator

- Manages deployment, technical configuration, accounts, role mechanics and service health under separation of duties.
- Cannot alter official results, payment allocations, admissions decisions or restricted support notes.

## ROLE-AUDIT — Auditor

- Receives read-only, purpose-limited access to approved evidence and audit history.
- Cannot use audit access as a general operational search facility.

## Role-switching requirement

A person with multiple roles must choose an active workspace. Every command records the active role and scope; the system does not silently combine all permissions into a single super-role.
