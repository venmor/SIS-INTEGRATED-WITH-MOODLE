# All-page presentation and timetable notices — 15 October 2026

Lead Charles Hangoma; reviewer Chitindu Milimbo. User-approved reference images and the instruction to modernise every page control this increment. [UI task](../task-packets/TASK-V2-UI-010.md), [notice task](../task-packets/TASK-V2-NOTIFY-001.md), [staff coverage](../design/STAFF-UI-COVERAGE-2026-10-14.md), [portal coverage](../design/PORTAL-UI-COVERAGE-2026-10-14.md).

## Result and implementation decisions

The previous release changed the shared staff frame and two registries. This increment selects explicit task presentation for all 49 staff routes, the 34 public/authentication/applicant/student templates and 9 notification/design-preview templates. Source coverage totals 92; it does not assert individual acceptance of every possible record state. Root unavailable/not-found pages share accessible return/retry actions as well.

Desktop staff navigation and the right workspace now have separate scroll containers inside a viewport-height shell. Identity/account remains outside the navigation scroller; the top bar remains above the workspace. Internal route changes reset the workspace scroll. Mobile retains a labelled navigation disclosure and normal document scrolling. Focused top navigation remains appropriate for applicants/students under UI Constitution 19.3.

Local staff/portal classes replace the native short controls and canvas-only record lists. Existing data, endpoint paths, field names, authority checks, errors, pending states and submitted values remain authoritative. Comparison tables become labelled mobile records. No decorative metrics or fake actions were introduced. A shared darker link token fixes measured contrast failures on approved tinted surfaces. Finance adjustment/arrangement tasks receive white panels, and payment choices receive 44px label targets after visual review exposed those omissions.

The separate notification owner consumes durable timetable publications in bounded atomic pages, preserving source eligibility, retries and deduplication. The owned notification centre now shows the explanation, responsible office, CAT timestamp and secure action. Protocol-relative, external, backslash and control-character paths cannot become navigation links. Staff signal projections remain smaller. Existing pinned cloud demonstration authorisation is documented explicitly; Vercel has no background timer, so automatic cloud scheduling is not claimed.

## Verification

All commands used Node 24.21.0, owned loopback PostgreSQL databases and generated participants. Docker was inactive; a private native PostgreSQL cluster was started without changing the saved demo database or installing system packages. A cached free PostgreSQL package needed approximately 1.2 MB of resumed transfer. No paid provider, image or font was downloaded.

- API and web builds passed after sequencing shared-config generation before consumers. An initial concurrent build/import failure was environmental and is not claimed as an application regression.
- TypeScript, workspace lint and source scan passed; API lint retains existing warnings. All 49 script checks passed.
- All 490 API unit tests passed with 13 existing skips. Six isolated connected suites passed 72/72, including the 12 new timetable-notification cases; see [notice evidence](NOTE-V2-NOTIFY-001.md).
- Focused staff 2/2, portal 2/2 and enhanced notification 1/1 browser checks passed. The latter verifies explanation/office/action, read receipt, mandatory no-mute behavior and rejection of an external action URL.
- The complete connected browser run passed 136/137. Its remaining test used a global course-text selector which matched desktop and mobile copies. Named visible history regions now scope the assertions. The focused complete student journey then passed, including contact/correction, registration, timetable status, changes, waitlist, finance, payment and arrangement. A pre-existing queued-only handoff assertion was also corrected to accept either actual queued or already worker-confirmed synced status while requiring official registration completion. Neither change weakens server state or authorization. Fresh remote CI remains the whole-suite merge gate.
- Final six corrected staff captures and 28 portal captures have zero axe violations, horizontal overflow or unlabelled controls. Portal captures have one main landmark; checked text fields and payment labels meet 44px. All six staff and ten changed portal images were visually reinspected. The 1280×500 staff check verifies independent scrolling, pinned account, internal navigation reset and Escape behavior.
- Independent staff and notice reviews found no remaining Critical/Important source issue after the scope wording was reconciled with owner-authorised pinned cloud demonstrations. No human acceptance is invented.

Private command logs, screenshots, database backups and credentials stay under ignored paths. Release commit, remote CI, schema migration and deployed alias/browser receipts are recorded separately after those operations complete. No secret or participant password belongs in Git.

## Remaining work

This closes the selected presentation increment and bounded in-system timetable notice owner, subject to remote release verification. It does not complete all v2 domains. [SETUP-004](../task-packets/TASK-V2-SETUP-004.md) specifies the next academic-governance dependency but is not implemented. The [completion sequence](../roadmap/V2-COMPLETION-SEQUENCE-2026-10-14.md) retains progression, examinations/attendance, automatic Moodle source delivery, protected proactive services/AI, provider finance and institutional records as separate work. Synthetic demonstration policies are not institutional approval.
