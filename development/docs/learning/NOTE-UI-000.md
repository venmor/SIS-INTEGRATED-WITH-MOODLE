# Learning Note — UI-POLISH Wave 0 (foundation)

- Lead developer: Chitindu Milimbo (proposed; TASK-UI-POLISH)
- Reviewer: Charles Hangoma (proposed)
- Date: 2026-09-24, presentation track (no release bump)

## What was built and why

Shared foundation so every screen earns its place with one pattern
per information kind: missing tokens added (`--space-5/10`, weights,
shadows), the `space-5` fallback hack codemodded away in 8 CSS files,
and five `@sis/ui` primitives (Card, DataTable with mobile record
cards, Money, StatusChip, PageHeader). No visual change to existing
screens yet by design.

## Verification

- Typecheck clean. Component contracts follow the catalogue word for
  word (text-first status, tabular money, labelled tables).
