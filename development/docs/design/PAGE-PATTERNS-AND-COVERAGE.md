# SIS page-pattern coverage — 12 October 2026

This inventory covers the 89 current page routes at base `fd10bab`. A route existing in code does not establish visual, accessibility, functional or operational completion. UI-008 implements one cross-journey increment; remaining families need their own data/state and browser review.

The interface should expose decisions and next actions first, then facts and filters, then optional detail and history. Charts need actual source-owned aggregate data, a decision purpose and accessible data; no decorative analytics are introduced.

| Family | Required structure | Preserved behavior / future review |
|---|---|---|
| Authentication | Task heading, labelled credentials, one submit, recovery, distinct discovery route | Password manager/paste, neutral failure, request progress, safe return URL |
| Discovery | Search first, expandable filters, concise result facts, compare tray, bounded results | URL-backed filter/page state and actual offering availability |
| Workspace overview | Current context, authoritative status, next real task, quieter record/history | Unknown status remains unknown; no fabricated metrics |
| Guided task | Location-only steps, grouped fields, save state, recoverable errors, next action | Steps never certify completion; preserve draft and version semantics |
| Work queue | Applied scope/filter, comparable rows, real selection, sorting/paging, bounded mobile cards | Server permissions/cursors remain authoritative; safe bulk work needs separate authority |
| Record/evidence | Identity/context, key facts, actionable discrepancy, evidence, optional history | Preserve privacy and source provenance; avoid duplicated full-record fields |
| Review/receipt | Reviewed course/decision table, blocking reasons, consequences/declarations, exact receipt | No submit when known invalid; exact idempotency and uncertainty recovery |
| Governed setup | Source/version summary, effective period, structured repeatable fields, preview/diff, review/activation separation | Requires independently verified setup UI; not claimed complete by this increment |
| Timetable | Context, publication source/state, course/week filters, readable dated sessions and changes | Live lineage and valid registration; no data projection disguised as publication |

## Route inventory

“In increment” means source presentation changed, with exact verification in NOTE-V2-UI-008. “Further review” is explicit remaining visual/state verification work, not a claim that the existing route is broken.

| Route | Screen family | UI-008 scope |
|---|---|---|
| `/` | Entry / workspace overview | Further review |
| `/admin/admissions/case/[id]` | Record / evidence / guided task | Further review |
| `/admin/admissions/queue` | Work queue / searchable inventory | Further review |
| `/admin/assessment/batches` | Task / record inventory | Further review |
| `/admin/assessment/batches/[id]` | Record / evidence / guided task | Further review |
| `/admin/assessment/findings` | Task / record inventory | Further review |
| `/admin/assessment/findings/[id]` | Record / evidence / guided task | Further review |
| `/admin/assessment/mappings` | Task / record inventory | Further review |
| `/admin/assessment/mappings/[id]` | Record / evidence / guided task | Further review |
| `/admin/assessment/mappings/[id]/decide` | Record / evidence / guided task | Further review |
| `/admin/assessment/moderation` | Task / record inventory | Further review |
| `/admin/assessment/moderation/[id]` | Record / evidence / guided task | Further review |
| `/admin/assessment/packages` | Task / record inventory | Further review |
| `/admin/assessment/packages/[id]` | Record / evidence / guided task | Further review |
| `/admin/assessment/packages/[id]/release` | Record / evidence / guided task | Further review |
| `/admin/assessment/plans` | Task / record inventory | Further review |
| `/admin/assessment/plans/[id]` | Record / evidence / guided task | Further review |
| `/admin/assessment/plans/[id]/decide` | Record / evidence / guided task | Further review |
| `/admin/assessment/publications` | Review / decision / receipt | Further review |
| `/admin/assessment/publications/amendments/[id]` | Review / decision / receipt | Further review |
| `/admin/audit` | Work queue / searchable inventory | Further review |
| `/admin/finance` | Workspace overview | Further review |
| `/admin/finance/adjustments` | Task / record inventory | Further review |
| `/admin/finance/arrangements` | Task / record inventory | Further review |
| `/admin/finance/cases` | Task / record inventory | Further review |
| `/admin/finance/cases/[id]` | Record / evidence / guided task | Further review |
| `/admin/finance/cashier` | Task / record inventory | Further review |
| `/admin/finance/sponsorships` | Task / record inventory | Further review |
| `/admin/grants` | Task / record inventory | Further review |
| `/admin/integration` | Task / record inventory | Further review |
| `/admin/integration/deliveries/[id]` | Record / evidence / guided task | Further review |
| `/admin/integration/reconciliation` | Work queue / searchable inventory | Further review |
| `/admin/integration/replays/[id]` | Record / evidence / guided task | Further review |
| `/admin/moodle` | Task / record inventory | Further review |
| `/admin/moodle/maintenance` | Task / record inventory | Further review |
| `/admin/moodle/mappings` | Task / record inventory | Further review |
| `/admin/records/duplicates` | Work queue / searchable inventory | Further review |
| `/admin/reviews` | Work queue / searchable inventory | Further review |
| `/admin/reviews/[id]` | Work queue / searchable inventory | Further review |
| `/admin/setup/readiness` | Governed setup / versioned configuration | Further review |
| `/admin/setup/university` | Governed setup / versioned configuration | Further review |
| `/admin/support` | Workspace overview | Further review |
| `/admin/support/[id]` | Record / evidence / guided task | Further review |
| `/admin/support/follow-ups` | Work queue / searchable inventory | Further review |
| `/admin/teaching/groups` | Task / record inventory | Further review |
| `/admin/timetabling/demo-rules` | Governed setup / versioned configuration | Further review |
| `/admin/timetabling/master` | Schedule / source preview | Further review |
| `/admin/timetabling/publications` | Review / decision / receipt | Further review |
| `/applicant` | Workspace overview | Further review |
| `/applicant/[id]` | Record / evidence / guided task | Further review |
| `/applicant/[id]/[section]` | Record / evidence / guided task | Further review |
| `/applicant/[id]/clarifications` | Record / evidence / guided task | Further review |
| `/applicant/[id]/corrections` | Record / evidence / guided task | Further review |
| `/applicant/[id]/decision` | Record / evidence / guided task | Further review |
| `/applicant/[id]/offer` | Record / evidence / guided task | Further review |
| `/applicant/[id]/onboarding` | Record / evidence / guided task | Further review |
| `/applicant/[id]/status` | Record / evidence / guided task | Further review |
| `/applicant/[id]/tickets` | Record / evidence / guided task | Further review |
| `/applicant/[id]/withdraw` | Record / evidence / guided task | Further review |
| `/applicant/help` | Task / record inventory | Further review |
| `/applicant/notifications` | Task / record inventory | Further review |
| `/applicant/start` | Task / record inventory | Further review |
| `/design-preview` | Task / record inventory | Further review |
| `/design-preview/operations` | Task / record inventory | Further review |
| `/design-preview/operations/event` | Task / record inventory | Further review |
| `/design-preview/operations/reconciliation` | Work queue / searchable inventory | Further review |
| `/design-preview/student` | Task / record inventory | Further review |
| `/design-preview/student/registration` | Task / record inventory | Further review |
| `/design-preview/teaching` | Task / record inventory | Further review |
| `/design-preview/teaching/course` | Task / record inventory | Further review |
| `/discover` | Discovery / programme record | In increment |
| `/discover/[id]` | Discovery / programme record | Further review |
| `/discover/[id]/eligibility` | Discovery / programme record | Further review |
| `/discover/compare` | Discovery / programme record | Further review |
| `/recovery` | Authentication | Further review |
| `/recovery/reset` | Task / record inventory | Further review |
| `/sign-in` | Authentication | In increment |
| `/student` | Workspace overview | In increment |
| `/student/changes` | Task / record inventory | Further review |
| `/student/courses` | Task / record inventory | In increment |
| `/student/finance` | Task / record inventory | Further review |
| `/student/finance/arrange` | Task / record inventory | Further review |
| `/student/finance/pay` | Task / record inventory | Further review |
| `/student/readiness` | Task / record inventory | In increment |
| `/student/register` | Review / decision / receipt | In increment |
| `/student/results` | Task / record inventory | Further review |
| `/student/support` | Task / record inventory | Further review |
| `/student/support/[id]` | Record / evidence / guided task | Further review |
| `/student/timetable` | Schedule / source preview | Further review |

## Next increments

1. Governed university setup: structure/calendar editing and exact-version approval preview; make dense repeatable rows easy to scan without changing activation authority.
2. Admissions: application stages, uploaded evidence, applicant correction/status, staff work allocation and evidence decisions; preserve individual high-impact review.
3. Finance: account/statement comparison, charges/reconciliation, arrangements/adjustments/refunds; clear received/pending/confirmed distinction.
4. Academic delivery/results: master/course preview, examination preparation, assessment mapping/staging/validation, publication and amendment packages.
5. Support/operations: named receiving services and confidential conversation/action/history; Moodle source-to-delivery run/mapping/claim state.

Each increment must cover loading, empty, unknown, denied, stale, failure, recovery, desktop/mobile and keyboard behavior for its actual routes. UI-008 does not silently mark these remaining families complete.
