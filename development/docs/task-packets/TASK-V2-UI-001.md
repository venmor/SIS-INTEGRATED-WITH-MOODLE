# TASK-V2-UI-001 — Applicant UI foundation

## Authority and scope

- User direction, 2026-10-02: improve the basic SIS UI with Tailwind CSS and purposeful micro-interactions.
- Sources: approved UI constitution, exact Applicant Blueprint Part 6 and cross-blueprint UI-FLOW-001/UI-UPLOAD-001/002, v2 operating-SIS spec §3.3, applicant document handoff TASK-V2-APP-001. See ADR-003 for the additive Tailwind decision.
- Lead Charles Hangoma; reviewer Chitundu Milimbo; human visual/accessibility acceptance pending.
- Scope: Tailwind web setup, semantic token mapping, applicant shell and supporting-document workflow. Preserve document quarantine, upload receipt, qualification blockers and all existing API authority.

## Acceptance

- Header and document screen have clear hierarchy and compact, responsive action groups at desktop and 390px widths, with no horizontal overflow.
- Required document states and the next action remain immediately scannable; selected file, transfer progress and saved-receipt wait are truthful and accessible.
- Focus is visible, controls are keyboard reachable, and nonessential transitions stop under reduced-motion preference.
- Existing applicant and public browser journeys pass. Web build, typecheck, lint and formatting pass; record any remaining visual or manual review gaps.
