# Palette's Journal

## 2026-09-22 - Explicit context on repeated list action buttons
**Learning:** Generic action button labels in multi-item lists (e.g. "Mark complete") lack accessible context for screen reader users navigating controls directly.
**Action:** Always provide an explicit `aria-label` (e.g. `Mark complete: [Title]`) and use standard `ActionButton` pending states on list action controls.

## 2026-10-14 - Immediate keydown feedback and aria-describedby association for input modifier warnings
**Learning:** KeyUp-only modifier state checks delay caps-lock warnings until key release, and status messages unlinked from aria-describedby can be missed by screen reader users focusing the input.
**Action:** Handle both keydown and keyup for modifier state changes on input fields, and dynamically append the warning ID to aria-describedby while active.
