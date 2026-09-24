# Admissions Staff UI Modernization Implementation Plan

> **Execution mode:** Native / inline, using the existing draft PR CI as the test runner.

**Goal:** Turn the existing admissions Phase 3 functionality into the professional staff workspace described by the approved handbook, while preserving authorization, evidence, recommendation, decision and audit semantics.

**Spec:** `development/docs/superpowers/specs/2026-09-23-handbook-driven-ui-modernization-design.md`

## Controlling handbook sources

- `02-INSTITUTIONAL-AND-SYSTEM-DESIGN/06-design-section-6-admissions-onboarding-and-student-finance.md`
- `03-USER-EXPERIENCE-BLUEPRINTS/07-admissions-registry-examinations-and-graduation-operations.md`
- `04-UI-UX-DESIGN-SYSTEM/05-actions-queues-records-feedback-and-recovery.md`
- `15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/004-cross-blueprint-implementation-set-part-2c-actions-queues-records-feedback-and-recovery-co.md`
- `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/05-phase-3-admissions-review-and-offer.md`

## Global constraints

- No SaaS dashboard patterns, gradients, glass, decorative metrics or excessive cards.
- Copy stays short and direct. Structure, labels and status must communicate before prose.
- Staff workspace remains dense enough for professional work.
- Reviewer and decision authority are visually separated as well as backend-enforced.
- Do not change API routes, authorization rules, case state machines, idempotency, decision semantics or audit behavior.
- Applicant-visible and staff-only content remain distinct.
- No critical action may depend on hover or horizontal scrolling.
- Mobile queue records become labelled vertical records; case pages remain one-column where needed.
- Loading, empty, error, stale, denied and pending states remain distinguishable.
- High-impact decisions remain deliberate and consequence-aware.

## Existing baseline

The branch already contains:
- role-aware staff shell,
- responsive queue rows,
- queue filters,
- structured case forms,
- loading skeletons,
- full Phase 3 browser journey,
- backend separation of recommendation and decision authority.

This plan modernizes hierarchy and role presentation rather than rewriting the workflow.

---

### Task 1 — Queue: show active work and filters clearly

**Files**
- Modify `development/apps/web/app/admin/admissions/queue/page.tsx`
- Modify `development/apps/web/app/admin/admissions/queue/queue.tsx`
- Modify `development/apps/web/app/admin/admissions/queue/queue.module.css`
- Modify `development/tests/browser/admissions-queue.spec.ts`

**RED contract**
After applying `Only cases needing action`, the queue must expose a concise active-filter summary:
- region/name: `Active filters`
- text: `Action needed`
- result count remains visible
- 390px has no horizontal overflow

**Implementation**
- Shorten page lede to `Review assigned cases and claim new work.`
- Replace verbose `Showing ...` sentence with compact count.
- Add removable-style active filter labels visually, but keep current filter form behavior.
- Do not add saved views or search because those are not implemented in this slice.

**Commit:** `feat(ui): clarify admissions queue state`

---

### Task 2 — Case header: make the governed record clear immediately

**Files**
- Modify `development/apps/web/app/admin/admissions/case/[id]/page.tsx`
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.tsx`
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.module.css`
- Modify `development/tests/browser/admissions-queue.spec.ts`

**RED contract**
Officer case page must expose:
- region/name `Case summary`
- reference
- programme + intake
- current state
- open clarification/correction counts
- policy/requirement version
- concise restricted-file notice
- no mobile overflow

**Implementation**
- Add a fixed record-summary region at the top of the case.
- Use `Status` for current state; avoid long explanatory text.
- Keep technical IDs out of the primary summary.
- Shorten page lede to `Review evidence and record the case outcome.`

**Commit:** `feat(ui): add admissions case summary`

---

### Task 3 — Make evidence comparison readable, not raw object output

**Files**
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.tsx`
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.module.css`
- Modify `development/tests/browser/admissions-queue.spec.ts`

**RED contract**
Officer case evidence area must expose:
- heading `Evidence review`
- labelled subregions `Personal`, `Contact`, `Qualifications`, `Documents`
- document filename and processing status
- no text `Declarations vs documents`
- no horizontal overflow

**Implementation**
- Replace raw unordered `key: value` lists with compact definition-list rows.
- Convert camelCase keys to readable labels.
- Keep document bytes unavailable; show filename/category/status/version only.
- Use separators rather than wrapping every group in a card.
- Keep all existing evidence data unchanged.

**Commit:** `feat(ui): structure admissions evidence review`

---

### Task 4 — Reviewer workspace: separate findings, clarification and recommendation into task regions

**Files**
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.tsx`
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.module.css`
- Modify `development/tests/browser/admissions-queue.spec.ts`

**RED contract**
For `ADMISSIONS_OFFICER`:
- regions/headings exist for `Findings`, `Clarification`, `Recommendation`
- current recommendation is shown as a compact package summary
- release-decision form is not shown
- existing finding, clarification and recommendation actions still work

**Implementation**
- Add explicit role to `ReviewCase`.
- Reviewer task regions use one primary action each.
- Shorten routine guidance.
- Retain the existing forms and POST payloads unchanged.
- Officer sees a short `Decision: separate approver` status rather than decision controls.

**Commit:** `feat(ui): focus admissions reviewer workspace`

---

### Task 5 — Approver workspace: show decision package, not reviewer editing controls

**Files**
- Modify `development/apps/web/app/admin/admissions/case/[id]/page.tsx`
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.tsx`
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.module.css`
- Modify `development/tests/browser/admissions-queue.spec.ts`

**RED contract**
For `ADMISSIONS_APPROVER`:
- heading `Decision`
- recommendation package is visible
- `Release a decision` form is visible
- reviewer mutation forms (`Record a review finding`, `Raise a clarification request`, `Record a recommendation`) are absent
- existing conditional-offer release journey remains green

**Implementation**
- Server page loads active workspace role via the existing authenticated `/auth/me` pattern.
- Pass role into `ReviewCase`.
- Render decision controls only for approver role.
- Render evidence/recommendation package read-only for approver.
- Shorten the current long authority/consequence paragraph into compact metadata plus only the material irreversible consequence.
- Backend remains final authority.

**Commit:** `feat(ui): separate admissions decision authority`

---

### Task 6 — History and corrections: make chronology and pending work scan quickly

**Files**
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.tsx`
- Modify `development/apps/web/app/admin/admissions/case/[id]/case.module.css`
- Modify `development/tests/browser/admissions-queue.spec.ts`

**RED contract**
- heading `Case history`
- history renders as a timeline, newest first
- each event exposes date, actor role, visibility and human-readable label
- pending corrections render as distinct actionable records
- staff-only marker remains visible
- no horizontal overflow at 390px

**Implementation**
- Use a vertical timeline treatment, no decorative animation.
- Keep event codes secondary.
- Remove notebook-style sentence `Newest first, including...`; the layout and visibility labels communicate it.
- Keep approve/decline semantics unchanged.

**Commit:** `feat(ui): clarify admissions history and corrections`

---

### Task 7 — Staff visual evidence + full gate

**Files**
- Create `development/tests/browser/ui-admissions-workspace.visual.spec.ts`
- Update execution ledger

**Evidence captures**
- 1440px admissions queue
- 390px admissions queue
- 1440px reviewer case
- 1440px approver decision case where practical in fixture journey

**Assertions**
- no horizontal overflow
- no page-level gradients
- staff navigation visible
- critical actions remain text-labelled

**Verification**
CI must pass:
- source scan + scripts
- lint
- unit tests
- migrations/seed
- both API e2e groups
- production build
- typecheck
- complete browser suite
- browser-evidence artifact upload

**Final review focus**
- role leakage,
- recommendation/decision confusion,
- card overuse,
- long explanatory copy,
- high-impact decision placement,
- mobile overflow,
- applicant/staff content mixing.

**Commit:** `test(ui): capture admissions workspace evidence`

## Completion contract

Complete only when:
- every new semantic contract was observed RED before production implementation;
- existing Phase 3 admissions journey still passes;
- reviewer/approver separation remains enforced by backend and communicated by UI;
- complete CI is green;
- both Vercel projects are green;
- no gradients/glass/dashboard drift was introduced;
- final self-review has no Critical/Important findings, or each is fixed RED→GREEN.
