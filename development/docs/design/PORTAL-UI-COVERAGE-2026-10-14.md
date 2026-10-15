# Public, applicant and student interface coverage — 14 October 2026

This presentation increment covers all **34 page templates** in the public/authentication, catalogue, applicant and student families at release base `ca24d60`. The dynamic applicant section template also renders personal details, contact, qualifications, documents, programme selection, application review and receipt. It does not mean every possible record state has received individual visual acceptance.

The approved UI Constitution 19.3 keeps applicant and student navigation focused at the top. The emerald active navigation, white task surfaces, pale canvas, labelled controls and compact information hierarchy carry the user's reference direction into these portals without using a staff administration rail. Staff scroll containment belongs to the parallel staff-shell change. Account/workspace controls remain real links or the existing sign-out action.

Source authority: exact `04-engineering-foundation/001-section-19-part-1-ui-ux-design-constitution.md` and `03-cross-blueprint/002-cross-blueprint-implementation-set-part-2a-ui-system-foundations-and-input-components.md`; existing applicant/student journeys and approved v2 operating-SIS specification; user's 14 October all-page instruction. Original handbook approval bodies are unchanged. No new API, database schema, roles, institutional policy, provider, image/font/icon package or paid call is introduced.

## Route coverage

“Inherited” means the existing task components use the changed portal/canvas/field patterns. “Explicit” means the task composition or its local record presentation changed as well. Both remain subject to final connected browser and visual review.

| Route template | Composition and source change |
|---|---|
| `/` | Entry panels, workspace overview, emerald context and real entry actions; inherited public pattern |
| `/sign-in` | Credential task and quieter starting-point panel; existing password-manager/error/recovery behaviour retained |
| `/recovery` | Explicit named account-recovery task surface and public return navigation |
| `/recovery/reset` | Explicit named new-password surface, public return navigation and announced loading fallback |
| `/discover` | Compact search/filter surface, source-backed results and existing URL paging/compare state |
| `/discover/[id]` | Explicit overview, responsive requirement table, checklist and real eligibility/application actions |
| `/discover/[id]/eligibility` | Explicit qualification task surface around the existing guided state machine |
| `/discover/compare` | Existing responsive comparison with consistent catalogue navigation and public canvas |
| `/applicant` | Existing application cards/progress/next task under modern portal pattern |
| `/applicant/start` | Existing policy-derived programme/start task under modern portal pattern |
| `/applicant/[id]` | Existing source/version/section workbench under modern portal pattern |
| `/applicant/[id]/[section]` | Explicit shared form surface; personal/contact/qualification controls, document progress, review and receipt retain existing state handling |
| `/applicant/[id]/clarifications` | Explicit response task surface; request records and timelines use portal pattern |
| `/applicant/[id]/corrections` | Explicit correction task surface and existing request cards |
| `/applicant/[id]/decision` | Explicit released-decision task surface; private deliberate open preserved |
| `/applicant/[id]/offer` | Explicit offer details and separate acceptance/decline task surfaces; consequences unchanged |
| `/applicant/[id]/onboarding` | Explicit source-count progress and labelled task/status/owner cards |
| `/applicant/[id]/status` | Explicit white timeline surface; current status and real timestamps remain source-derived |
| `/applicant/[id]/tickets` | Explicit new-ticket/reply task surfaces and existing case cards |
| `/applicant/[id]/withdraw` | Explicit withdrawal task surface; confirmation and authority preserved |
| `/applicant/help` | Existing grouped guidance under modern portal pattern |
| `/applicant/notifications` | Explicit comparable inbox records with written read/unread status |
| `/student` | Existing authoritative registration summary and task-first cards under modern portal pattern |
| `/student/readiness` | Existing grouped readiness/context/steps with consistent controls and canvas |
| `/student/courses` | Existing searchable/sortable/paged course board with consistent controls and canvas |
| `/student/register` | Existing course review, consequences, declarations and exact receipt with consistent controls and canvas |
| `/student/changes` | Explicit addition/drop/waitlist task surfaces and responsive change/waitlist histories |
| `/student/timetable` | Existing bounded week/day/list and publication state under modern portal pattern |
| `/student/finance` | Explicit period picker, statement actions, totals and receipt surfaces; source amounts unchanged |
| `/student/finance/pay` | Explicit separate initiation/offline-report task surfaces and existing responsive request history |
| `/student/finance/arrange` | Explicit proposed-arrangement task and responsive history; unavailable history no longer appears as an empty list |
| `/student/results` | Explicit compact result facts, source history and single parent main landmark |
| `/student/support` | Existing named receiving adviser and source-backed request cards under modern portal pattern |
| `/student/support/[id]` | Explicit follow-up/conversation surfaces; confidentiality and real reply/action state retained |

## Decisions and checks

- Shared local CSS provides minimum 44px controls on small screens, visible labels, retained focus indicators, intentional field grouping and written disabled/loading states. Existing component-specific styles retain priority; radio/checkbox controls do not become full-width text fields.
- Course-change errors link to the actual submitted course-code field rather than the nonexistent `course-change` anchor.
- Arrangement history failures show unavailable state, independently from successful empty history. They do not certify that no requests exist.
- Catalogue navigation is in its route layout so programme detail, comparison, eligibility, missing and unavailable branches share the same real return paths.
- A student result is rendered inside the portal's single main landmark rather than nesting another `main`.
- Course-change, statement, payment-request and arrangement histories keep the DataTable heading as their single section heading. A surrounding task surface no longer repeats the same history title for screen-reader heading navigation.
- New `portal-ui-direction.spec.ts` checks mobile recovery navigation and retained username after failure; minimum touch-size course controls, retained course/reason after conflict, the actual error-field anchor and no horizontal overflow. Baseline compiled `ca24d60` reproduced both required failures: missing recovery public navigation and a 21px course-code input. Final browser/visual evidence is recorded in the release verification note after the coordinated build.
- Recovery assertions distinguish the linked error summary from the inline field error and verify the username's error association. Matching the error text alone was ambiguous because both approved error presentations correctly contain it.

This is interface coverage, not closure of unimplemented institutional capabilities. AI, live payment-provider execution, broader academic progression and other major v2 journeys remain tracked in the completion sequence. No decorative chart or invented dashboard total was added to imply those capabilities exist.

## Continuation check — 15 October 2026

Web TypeScript (`tsc --noEmit --incremental false -p apps/web/tsconfig.json`), formatting for the revised portal test/history pages and `git diff --check` passed. After the release lead restored the isolated preview, both focused portal browser cases passed (`.local-release/portal-ui-final.log`). The initial private visual sweep completed 28 captures: 14 states at 1672px and 390px, with no scenario failures, horizontal overflow, unlabelled controls or duplicate main landmarks. All visible text fields met the 44px minimum. The unnamed outer `Card` sections did not create extra landmark regions; each named DataTable history kept its own heading and region.

The sweep's applicant upload/submission, student registration/addition, assessed invoice and academic-support request use real connected actions with fresh fictional fixture identities. Released decision and result versions are explicitly rendering fixtures, matching existing browser tests; they do not prove approval/publication authority. Visual inspection covered all 28 initial images in `.local-release/portal-all-ui-*-{1672,390}.png`. The initial axe scan found contrast failures on the entry programme link, fresh recovery link and practice-document link, each at both widths; `.local-release/portal-all-ui-review-before-contrast.json` preserves those findings. The final correction darkens shared links, widens payment-method label targets and separates result-review guidance.

## Final focused confirmation — 15 October 2026

The rebuilt isolated preview completed the same 28 captures with no scenario failures, WCAG 2 A/AA or WCAG 2.1 AA axe violations, horizontal overflow, unlabelled native fields or visible text controls shorter than 44px. Every capture has exactly one main landmark. All four payment-method labels measured at least 44px high at both widths; the wrapped mobile bank-transfer label measured about 66px. Final evidence is `.local-release/portal-all-ui-review.json` and the corresponding 28 PNGs.

Visual reinspection covered the changed entry, missing recovery-link, applicant upload, student payment and student results states at both 1672px and 390px. The corrected links are readable on their coloured surfaces, payment choices have separated usable targets, and result-review guidance has a distinct heading beneath the progression message. No further visual issue was found in these ten checked images.

Both focused portal browser cases passed again on the final build (`.local-release/portal-ui-final-20261015.log`, 2 passed). They verify mobile public recovery navigation, retained username and associated error after failure, retained course/reason after conflict, the actual error-field link, one change-history heading and narrow-screen overflow. This closes the specific findings in the checked states; it does not claim individual acceptance of every state on all 34 templates or institutional approval of the fictional fixtures.
