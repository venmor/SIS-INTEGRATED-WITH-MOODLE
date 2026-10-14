# TASK-V2-UI-009 — Staff reference UI verification

Date: 14 October 2026. Scope: the shared staff shell and the assessment-plan and grade-batch workspaces in `integration/v2-release-20261012`.

**Findings**

No actionable P0/P1/P2 visual findings remain in the inspected states. The desktop composition follows the selected emerald sidebar, gold active marker, compact white topbar, pale canvas and white workflow panels. The final mobile render retains visible disclosure markers and readable, labelled controls. This is scoped design verification; it is not institutional acceptance, a whole-SIS accessibility audit, or a claim that every staff page has been redesigned.

**Comparison evidence**

| Evidence                   | Path / configuration                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Selected plans reference   | `/home/hangoma/Pictures/direction_ui_version.png`                                                                                 |
| Selected batches reference | `/home/hangoma/Pictures/ui_direction_version1.png`                                                                                |
| Rendered routes            | `/admin/assessment/plans`, `/admin/assessment/batches`                                                                            |
| Final desktop captures     | `.local-release/v2-reference-plans.png`, `.local-release/v2-reference-batches.png`                                                |
| Final mobile captures      | `.local-release/v2-reference-plans-mobile.png`, `.local-release/v2-reference-batches-mobile.png`                                  |
| Interaction evidence       | `.local-release/v2-ui-interactions.json`, `.local-release/v2-ui-qa-probe.json`                                                    |
| Capture commands           | Node 24.21.0 running `.local-release/capture-v2-ui.mjs` and `.local-release/probe-v2-ui.mjs`, both exit 0 after the final rebuild |

Both source PNGs and both desktop captures are **1672 × 941 pixels**. Chromium used a **1672 × 941 CSS-pixel viewport**, device scale factor **1**, light theme and no browser chrome in the capture. No density resizing was needed. Mobile used a **390 × 844 CSS-pixel viewport**, scale factor **1**, with full-page captures of **390 × 2589** (plans) and **390 × 2165** (batches). The selected images have no mobile variant; mobile was evaluated as the responsive adaptation of their hierarchy, rather than as a pixel-identical mobile target.

State: the fictional seeded lecturer Chisenga L., offering scope SWE-2026S1, empty loaded registries. The plans desktop capture has offering SWE-2026S1 and period 2026S1 filled and a visible period focus ring. No draft or staging command was submitted during this read-only capture. Reference images show a different fictional actor and Moodle administration workspace; identity, permissions and navigation were deliberately not falsified to reproduce them.

Full source and implementation images were opened together in the same comparison input. Focused paired crops inspected draft controls and batch registry typography, icons, row alignment, input heights, search/filter placement and empty states. Final crops are `.local-release/reference-plan-controls.png`, `implementation-plan-controls.png`, `reference-batch-registry.png` and `implementation-batch-registry.png`. The final mobile disclosure crop is `implementation-policy-mobile.png`. These screenshots, crops and scripts are private local verification evidence; they are not shipped application assets or portable evidence in a fresh checkout.

**Required fidelity surfaces**

| Surface                 | Result and bounded differences                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts and typography    | Existing Geist renders titles at 32px/40px, with compact 14.4px field text. Hierarchy, weight, spacing and wrapping remain readable at both widths; no clipped field labels or headings were visible. The raster references do not identify their font. The existing font was retained without downloads. Action buttons retain the existing Arial treatment; optional harmonisation is listed below.                                                                                                                                                                      |
| Spacing and layout      | 304px rail, 70px topbar, restrained borders/shadows, aligned two-column top fields and compact desktop rows. Measured desktop inputs: 38px top fields, 32px component fields; mobile inputs/filter/policy summaries: 44px. Plans draft y252.9–765.8, registry y783.8; batches stage y276.9–705.8, registry y723.8. Plans are about24px taller than the reference because the accessible policy disclosure is retained. The plans empty-state explanation requires a short scroll at 941px height; this is disclosed rather than claiming identical above-the-fold content. |
| Colours and tokens      | Dark emerald rail, muted-green active row, gold marker, white surfaces and pale-grey canvas reproduce the direction with existing semantic tokens. Final breadcrumb foreground `#526174` on the rendered ancestor canvas `#f3f6f7` has 5.82:1 contrast. The component header uses the existing slightly darker sunken token rather than the reference's exact pale tint.                                                                                                                                                                                                   |
| Image and icon fidelity | No photos/illustrations are required. Existing vector NavigationIcon variants remain sharp and consistently sized; the existing SIS mark and real-name initials were reused. Icon silhouettes, avatar initials and flat fills differ from the reference under the explicit existing-component/no-new-assets constraint. No new icon, font, image dependency or decorative asset was introduced.                                                                                                                                                                            |
| Copy and content        | Concise task headings, required labels, policy guidance, permission hints and provisional/official distinctions are preserved. Actual ancestor breadcrumbs replace the reference's sibling-route chains. Registry controls act on loaded rows, rather than claiming an institutional search. Real role/scope-driven destinations replace the reference's static menu.                                                                                                                                                                                                      |

**Comparison history and corrections**

| Earlier finding                                                                                                        | Fix                                                                                                                                                           | Fresh evidence                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| P2: desktop density pushed the plans panel bottom to about884px and the registry to904px, versus reference 742/760px.  | Reduced panel/heading spacing, top fields to 38px and component inputs to 32px; retained 44px mobile controls, labels, authority hints and policy disclosure. | Final full captures and focused controls; measured plan bottom765.8/registry783.8. The remaining policy height is intentional. |
| P2: breadcrumb `#687386` on `#f3f6f7` was4.41:1, below the AA threshold for normal text.                               | Changed breadcrumbs and separators to `#526174`.                                                                                                              | Rendered computed foreground/ancestor background and 5.82:1 calculation.                                                       |
| P2: the mobile policy summary's `display:flex` suppressed its native disclosure marker, making it resemble plain text. | Restored `display:list-item`; kept 44px minimum height.                                                                                                       | Post-rebuild full mobile capture, focused policy crop, computed `list-item`/44px and successful keyboard disclosure toggle.    |

An independent read-only stylesheet review found the disclosure issue and confirmed the contrast calculation and mobile override ordering. Its earlier captures were not treated as final rendered proof. The post-fix capture was taken and compared again before recording this result.

**Interactions and runtime checked**

- Account opens with keyboard Enter and closes with Escape or an outside pointer action. Mobile Workspace sections expands into the actual navigation.
- Policy disclosure opens by keyboard; component focus has a visible solid outline. Reduced-motion mode computes a 0s action transition.
- Neither route has horizontal document overflow at 390px; plans also has none at 1672px. Mobile rows expose individual labels and preserve traversal through the complete form and registry.
- The final probe recorded **0 page errors**, **0 console errors** and **0 HTTP responses at 400 or above**. Next navigation/prefetch requests cancelled with `net::ERR_ABORTED` during route changes; these were recorded separately from errors.
- Scoped formatting and `git diff --check` passed after the marker correction. Full application builds and the 133-test browser regression run are tracked by the release owner separately; this report does not infer their result from visual captures.

**Open questions and remaining verification scope**

No unresolved question blocks this reference UI slice. Error/loading/success, populated long registries, alternate roles, text zoom, tablet breakpoints and other staff families remain part of their functional/regression or broader accessibility checks; these four captures do not certify every such state. Institutional scope limitations remain documented in GAP-V2-003 rather than being hidden by visual styling.

**Follow-up polish**

- P3: consider `font-family: inherit` on assessment action buttons in a future shared-control pass, to harmonise their current Arial glyphs with Geist field/body text.
- P3: the neutral empty-state spacing and current generic icon variants can be refined with a separately approved shared component/icon treatment. No extra asset dependency is required to operate these workspaces.

**Implementation checklist**

- [x] Compare full source/render views at the same desktop density and inspect focused regions.
- [x] Fix density, breadcrumb contrast and mobile disclosure affordance; rebuild, recapture and compare again.
- [x] Inspect 390px adaptation, labels, focus, keyboard controls, reduced motion and runtime console.
- [x] Document role/content/token differences and the limits of this evidence.
- [ ] Release owner completes and records the separate functional regression and release gates.

final result: passed
