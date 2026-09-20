# GAP-015 — Applicant production policy and incomplete earlier-phase gates

Status: Open for production and full phase acceptance; bounded fictional slices 2–5 implemented for review.
Raised: 2026-09-19, repository/handbook review requested by the user.

| Missing evidence or decision | Affected area | Current safe boundary | Required follow-up |
|---|---|---|---|
| Self-registration, verified contact delivery, MFA/step-up and accessible recovery alternatives | Blueprint 1 Part 3; Phase 1.2b; REQ-IAM-005/006 | Explicit synthetic account/contact seed; no claim of real verification | Identity task packet with approved proof and providers; implement and test enrolment/challenge/recovery |
| Institutional scope hierarchy and approval/training/appointment proof | REQ-IAM-003/004; GAP-003–007/012 | Existing fictional role mapping and live selected assignment checks | Approved capability/scope registry and independent approver proof; production use blocked |
| Application multiplicity, collection purpose, allowed routes/grades, document minimum stage, fees, declaration content and retention | Blueprint 1 Parts 4–8; REQ-ADM-002–004 | Named APPLICATION-DEMO-v1 fixture; one choice, max three active applications/intake, no fee; unsupported policy blocks submission | Business/data owners approve versioned rules and retention/deletion/legal-hold procedures |
| Arbitrary document safety | Blueprint 1 Part 6 | Quarantine. Exact bundled PDF accepted only with both demo flags. ClamAV failures remain pending; arbitrary PDFs require structural validation even after clean AV | Deploy updated antivirus plus an approved PDF structural/sanitization adapter; adversarial fixtures and operational monitoring |
| Production file storage and scaling | Restricted evidence storage | Private PostgreSQL byte storage and authorized response streaming; no public bucket or filesystem paths | Approved encrypted object storage, retention, upload abuse/capacity limits, content lifecycle and load tests |
| Delivery and later workflows | GAP-008/009; Phase 2.6 and Phase 3 onward | Transactional undelivered ApplicationSubmitted outbox event and immutable receipt | Implement delivery/reconciliation worker, status/clarification, staff assessment and student conversion in their owning slices |
| Human/cross-platform/accessibility proof | Phase 0/1/2 exit gates | Automated tests plus browser mobile/keyboard smoke | Charles and Chitindu replay on Arch/WSL, screen-reader and low-bandwidth tests, branch protection/CI review |

No production decision has been inferred from a sample, an AI suggestion or the evidence-folder rename. Lead/reviewer names in the new packets are proposed learning responsibilities; the unchecked walkthrough is the approval evidence to collect.
