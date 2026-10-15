# Staff page presentation and scroll repair

The first reference-led release modernised the shared staff frame and two assessment registries. The user correctly identified that legacy page imports and native forms still presented several workspaces differently, and that document scrolling allowed the sidebar to end above the workspace.

The extension gives every current staff route an explicitly selected staff presentation. Shared staff primitives keep compact headings, usable controls, white task panels, comparison records and consistent empty states. Existing specialised queues, previews, review steps and decision components keep their workflow-specific classes. This avoids replacing working controls with decorative dashboard content.

Grade mapping draft and test are separate panels; registry rows have one comparison view instead of a second repeated identifier list. Validation findings remain role-filtered evidence, with a surrounding task panel. Moodle administration shows actual navigable tasks and recorded simulator shells; it does not imply that cloud course provisioning is active merely because the connection status is healthy.

The viewport-height staff frame and separate navigation/workspace scroll regions are coordinated with the release lead. Account identity stays outside the navigation scrolling area. Mobile keeps native disclosure and document scroll behavior.

No endpoint, data model, assessment state, stored value, audit event or permission changed in this presentation slice. Existing browser journeys continue to exercise actual decisions rather than a visual mock. Web TypeScript passed after the source pass; runtime and final accessibility evidence are collected by the coordinated release checks.

The complete presentation inventory now covers 49 staff, 34 public/authentication/applicant/student and 9 notification/design-preview templates (92 total). The separate [portal coverage record](../design/PORTAL-UI-COVERAGE-2026-10-14.md) describes the focused portal navigation and connected fixture boundaries. This inventory is source coverage; it does not turn every possible record state into a visually accepted state.

Final focused verification on 15 October 2026 used the rebuilt loopback preview at web port 3150/API port 3151 and the persisted isolated `sis_v2_ui_review` database. Both staff cases passed, including independent navigation/workspace scroll, a visible stationary account at 1280×500, workspace reset, named task panels and 390px overflow checks. Both portal cases passed, including recovery and course-change failure recovery with entered data retained. Private logs are `.local-release/staff-ui-final-20261015.log` and `.local-release/portal-ui-final-20261015.log` (2 passed each).

The initial visual review exposed missing finance task panels and planner/public-link contrast failures. The final six staff captures and 28 portal captures have zero axe violations or horizontal overflow; native fields are labelled. The portal captures each contain one main landmark, all visible text fields are at least 44px high, and payment-method labels are at least 44px high. Individual final-image reinspection covered all six corrected staff states and ten corrected portal states at 1672px and 390px, with no further issue found. Evidence is `.local-release/staff-all-ui-targeted-after.json`, `.local-release/portal-all-ui-review.json` and their PNGs. These are scoped accessibility and visual checks; full connected workflow regression and human acceptance remain separate release-lead gates.

[Task](../task-packets/TASK-V2-UI-010.md) · [49-route inventory](../design/STAFF-UI-COVERAGE-2026-10-14.md) · [initial reference implementation](NOTE-V2-UI-009.md).
