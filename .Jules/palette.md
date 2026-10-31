# Palette's Journal

## 2026-09-22 - Explicit context on repeated list action buttons
**Learning:** Generic action button labels in multi-item lists (e.g. "Mark complete") lack accessible context for screen reader users navigating controls directly.
**Action:** Always provide an explicit `aria-label` (e.g. `Mark complete: [Title]`) and use standard `ActionButton` pending states on list action controls.

## 2026-09-22 - Dynamic form field status associations
**Learning:** Dynamic modifier status alerts (like Caps Lock warnings) rendered inside form fields must be linked to the input via `aria-describedby` with a matching `id` and evaluated on `onKeyDown` so screen reader users hear the warning as field context.
**Action:** When adding conditional helper/status messages to input components, always compute and append their `id` into `aria-describedby` and evaluate modifier key state immediately on `onKeyDown`.
