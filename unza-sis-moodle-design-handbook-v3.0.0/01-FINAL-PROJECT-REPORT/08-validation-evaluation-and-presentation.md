# Validation, Evaluation and Presentation

Validation covers normal behaviour, denial, failure, recovery, audit and accessibility. Critical workflows require end-to-end tests across applicant/student/staff handoffs and external-provider uncertainty. Release is blocked by failures affecting authorization, official results, payments, restricted data, regulatory submission, backup/restore, duplicate prevention or critical-journey accessibility.

The presentation uses fictional data and three connected stories: applicant-to-student, teaching-to-official-result, and governed support plus Moodle failure/recovery. Supporting evidence includes architecture and state diagrams, a configuration change without code change, an audit timeline, CI results, both developers’ pull-request history and a simulated incident with reconciliation.

Success is evaluated not by the number of screens but by whether users can complete governed tasks, the system preserves authority under failure, both developers can explain the implementation and evidence proves the declared release scope.
