# Palette's Journal

## 2026-09-22 - Explicit context on repeated list action buttons
**Learning:** Generic action button labels in multi-item lists (e.g. "Mark complete") lack accessible context for screen reader users navigating controls directly.
**Action:** Always provide an explicit `aria-label` (e.g. `Mark complete: [Title]`) and use standard `ActionButton` pending states on list action controls.

## 2026-09-22 - Explicit input association on toggle disclosure buttons
**Learning:** Toggle/disclosure buttons that modify input field visibility or state (e.g. show/hide password buttons) need `aria-controls={id}` referencing the controlled input element to explicitly link them for screen readers.
**Action:** Always set `aria-controls` on disclosure buttons controlling associated inputs in shared `@sis/ui` components.
