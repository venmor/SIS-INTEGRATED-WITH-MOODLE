# Palette's Journal

## 2026-09-22 - Explicit context on repeated list action buttons
**Learning:** Generic action button labels in multi-item lists (e.g. "Mark complete") lack accessible context for screen reader users navigating controls directly.
**Action:** Always provide an explicit `aria-label` (e.g. `Mark complete: [Title]`) and use standard `ActionButton` pending states on list action controls.
