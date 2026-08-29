# Cross-Role End-to-End Journeys

## Journey 1 — applicant to enrolled student

Public discovery → applicant account/contact verification → draft and evidence → payment/waiver → formal submission → admissions review/clarification → authorized offer → acceptance/onboarding → student conversion → course/financial checks → registration → Moodle provisioning → reconciliation.

Key handoff rule: each step emits a completed fact or assigned task. One role does not directly edit another domain’s record.

## Journey 2 — teaching evidence to official result

Course offering/teaching assignment → Moodle shell/enrolment → assessment plan → learning activity/provisional marks → staging snapshot → validation/moderation → examination/board package → authorized SIS release → student notification → amendment/appeal route.

Key handoff rule: Moodle evidence remains provisional until the SIS result workflow approves and publishes it.

## Journey 3 — observation to support and closure

Explainable observation → human triage → adviser review/outreach → student response → service offer/referral → restricted service case → permitted status back to adviser → follow-up/closure → aggregate outcome review.

Key handoff rule: private support content never travels back through ordinary academic status.

## Journey 4 — payment to clearance and reversal

Charge assessment → payment initiation → callback/reconciliation → allocation → clearance calculation → registration effect → later reversal/mismatch → recalculation → governed review and communication.

Key handoff rule: provider status does not grant clearance; the SIS calculates it from approved ledger and policy.

## Journey 5 — quality review to verified closure

Review/framework → evidence collection → assessment → proposed finding → owner response/action plan → action tracking → independent verification → closure/committee/regulatory package → acknowledgement/correction.

Key handoff rule: the evidence owner cannot independently verify their own corrective action where separation is required.

## Journey 6 — integration failure to reconciliation

Committed SIS action → outbox event → adapter delivery → uncertain/failure/dead-letter state → operations review → safe retry/replay → external state check → reconciliation evidence → incident closure.

Key handoff rule: an incident closes only when authoritative SIS and provider state are reconciled, not merely when a retry reports success.
