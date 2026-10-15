# Staff UI coverage — 14 October 2026

The user expanded the selected emerald navigation, white top bar, pale workspace and white task panel direction from two assessment pages to every existing page. This record covers staff routes only; student, applicant and public pages have separate ownership.

The shell has two desktop scroll regions: navigation inside the viewport-height sidebar, and the right workspace below the top bar. The sidebar account stays outside the navigation scroll area. Mobile navigation uses the existing accessible disclosure and natural document flow. The shell implementation is owned and verified by the release lead.

`app/admin/staff-workspace.module.css` contains explicitly selected page, task panel, field, button, record, fact-grid, table, empty-state and disclosure primitives. Legacy routes now import this staff-only module instead of the public page module. Already structured admissions, finance, support, setup and timetable components keep their own layout classes. There are no body-wide form selectors and no decorative charts, invented counts, fake actions or changed permissions.

Grade mappings now group draft, test and the registry as separate tasks with labelled full-size controls. Its duplicate registry text list was removed; identifiers remain in the detail and decision routes. Validation findings use a task panel around the existing role-filtered table. Moodle administration now has real task links for mappings, reconciliation and maintenance, followed by recorded simulator shell comparison. The simulator status and live provisioning limits remain truthful.

Known detail/decision routes use the same page hierarchy and explicit field/summary primitives. The native timetable comparison table now has named mobile record labels; it no longer forces horizontal workflow scrolling on narrow screens. Existing DataTable components retain their labelled mobile records.

## Route inventory

This is source coverage, not a claim that every state on every route has been visually accepted. All 49 staff route files have a selected staff presentation. The two assessment registries already used the reference-led workspace and keep it. Runtime assertions and screenshots must be reviewed after the release build.

| Route | Presentation |
| --- | --- |
| `/admin/admissions/case/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/admissions/queue` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/batches/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/batches` | Existing reference-led assessment workspace |
| `/admin/assessment/findings/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/findings` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/mappings/[id]/decide` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/mappings/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/mappings` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/moderation/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/moderation` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/packages/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/packages/[id]/release` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/packages` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/plans/[id]/decide` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/plans/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/plans` | Existing reference-led assessment workspace |
| `/admin/assessment/publications/amendments/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/assessment/publications` | Explicit staff workspace and retained task-specific components |
| `/admin/audit` | Explicit staff workspace and retained task-specific components |
| `/admin/finance/adjustments` | Explicit staff workspace and retained task-specific components |
| `/admin/finance/arrangements` | Explicit staff workspace and retained task-specific components |
| `/admin/finance/cases/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/finance/cases` | Explicit staff workspace and retained task-specific components |
| `/admin/finance/cashier` | Explicit staff workspace and retained task-specific components |
| `/admin/finance` | Explicit staff workspace and retained task-specific components |
| `/admin/finance/sponsorships` | Explicit staff workspace and retained task-specific components |
| `/admin/grants` | Explicit staff workspace and retained task-specific components |
| `/admin/integration/deliveries/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/integration` | Explicit staff workspace and retained task-specific components |
| `/admin/integration/reconciliation` | Explicit staff workspace and retained task-specific components |
| `/admin/integration/replays/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/moodle/maintenance` | Explicit staff workspace and retained task-specific components |
| `/admin/moodle/mappings` | Explicit staff workspace and retained task-specific components |
| `/admin/moodle` | Explicit staff workspace and retained task-specific components |
| `/admin/notifications` | Explicit staff workspace and retained task-specific components |
| `/admin/ops` | Explicit staff workspace and retained task-specific components |
| `/admin/records/duplicates` | Explicit staff workspace and retained task-specific components |
| `/admin/reviews/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/reviews` | Explicit staff workspace and retained task-specific components |
| `/admin/setup/readiness` | Explicit staff workspace and retained task-specific components |
| `/admin/setup/university` | Explicit staff workspace and retained task-specific components |
| `/admin/support/[id]` | Explicit staff workspace and retained task-specific components |
| `/admin/support/follow-ups` | Explicit staff workspace and retained task-specific components |
| `/admin/support` | Explicit staff workspace and retained task-specific components |
| `/admin/teaching/groups` | Explicit staff workspace and retained task-specific components |
| `/admin/timetabling/demo-rules` | Explicit staff workspace and retained task-specific components |
| `/admin/timetabling/master` | Explicit staff workspace and retained task-specific components |
| `/admin/timetabling/publications` | Explicit staff workspace and retained task-specific components |

## Verification boundary

- Web TypeScript check passed on Node 24.21.0 after the staff changes.
- Baseline browser test exposed the reported problem: the mapping field was a short native control rather than a usable task control.
- `staff-workspace-direction.spec.ts` checks real authorised mapping controls, the mapping/finding panels, Moodle task navigation, shell records and narrow-screen overflow.
- The release lead runs desktop independent-scroll/account persistence, connected workflow regressions, accessibility and screenshot comparison against the selected images before merging.
- A source inventory does not certify institutional authority, live Moodle delivery, or human acceptance of every screen. No such authority was added by this visual change.

## Browser review — 15 October 2026

The rebuilt isolated preview was reviewed at 1672×1000 and 390×844 for grade mappings, validation findings, Moodle administration, finance adjustments, assigned support requests, role assignments, tutorial groups and master timetable planning. The 16 captured states had no browser page errors, unnamed native fields or horizontal overflow at 390px. All eight mobile workspace disclosures opened. These captures include the seeded empty registries and prerequisite-blocked master planner; they do not cover every populated record, decision or recovery state on all 49 routes.

At 1280×500, scrolling the workspace to 659px and navigation to 110px left the sidebar account at the same vertical position and the document at scroll position zero. Following the sidebar's validation-queue link reset the new workspace to the top. The account disclosure opened and closed with Escape. An intercepted mapping-service failure preserved all three draft entries and re-enabled its action; it did not create a mapping.

The first 16 WCAG 2 A/AA axe scans found one contrast failure in both master-planner viewports: the publication link inherited the global blue link colour on a grey banner. Visual inspection also found the finance adjustment request and adjustment/arrangement registries missing their white task panels. The scoped correction adds those panels and an explicit accessible banner-link colour. Post-rebuild confirmation is recorded below.

Private, ignored evidence: `.local-release/staff-all-ui-review.json`, `.local-release/staff-all-ui-review.log`, and `.local-release/staff-all-ui-*.png`; before images for finance adjustments and the timetable use the `-before.png` suffix. Web TypeScript, focused finance-page ESLint and whitespace checks passed after the scoped correction. The source review found no changes to existing authorization, payloads, field identities or handlers. Full connected workflow regression and release acceptance remain separate release-lead checks.

## Final focused confirmation — 15 October 2026

The final rebuilt preview passed both focused staff browser cases (`.local-release/staff-ui-final-20261015.log`, 2 passed). At 1280×500 the automated scroll case again moved the workspace and navigation independently, kept the account visible at the same vertical position, kept document scrolling at zero, and reset the next workspace to the top. The mapping/finding/Moodle case confirmed the named task regions, usable authorised mapping field and 390px overflow boundary.

The six post-correction finance adjustment, arrangement and master-planner captures at 1672px and 390px were inspected individually. Both finance registries now have white task panels with visible borders; the request/decision forms remain distinct task surfaces. The planner publication link is legible on its grey banner. All six WCAG 2 A/AA axe scans reported zero violations, every native field had a label and neither viewport overflowed. The measured registry backgrounds were `rgb(255, 255, 255)`; the planner link was `rgb(0, 68, 18)` on `rgb(237, 237, 237)`.

Evidence: `.local-release/staff-all-ui-targeted-after.json` and `.local-release/staff-all-ui-{finance,arrangements,timetable}-{1672,390}-after.png`. These checks close the specific panel, contrast and scroll findings in the sampled states. The 49-route source inventory, full connected release regression and human acceptance remain distinct evidence boundaries.
