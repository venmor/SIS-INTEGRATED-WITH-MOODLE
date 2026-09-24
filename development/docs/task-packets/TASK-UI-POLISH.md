# TASK-UI-POLISH: Handbook-driven UI polish, waves 0–3

## Authority and ownership

User authorization: UI polish request + scope decisions (all waves,
align copy, no screenshots), 2026-09-24. No release bump (presentation
track). Proposed lead Chitindu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending (live localhost review,
no screenshot artifacts).

Controlling sources: 04-UI-UX-DESIGN-SYSTEM (constitution, catalogue,
foundations, actions/queues/records, overlays, accessibility, screen
index, visual checklist); journey books 01/02/08/07/12; design section
12 (portals/communications); permission visibility rules. Exact
records as prior packets. SUP-001–SUP-013 apply. No dependencies.
Owning area `packages/ui` + `apps/web` styles/pages.

## User outcome and boundaries

Every screen earns its place: one button/card/table pattern per
information kind, real aligned tables for money, task cards with
owner/due/action, full state coverage, orientation questions answered,
copy aligned to journey wording (sentence case, message pattern,
unambiguous dates/amounts/references). No behavior, policy, or data
changes; no dark mode; no decoration (gradients/glass/chatbots/cards-
for-looks stay banned); design-preview fixtures untouched.

## Policy and explicit demonstration scope

Fictional demo data only. Copy edits stay within journey-book wording;
no invented policy values, roles, or states. New `SCR-*` identifiers
only where the index rule requires (operations screens already have
theirs; no new screen families introduced).

## State authorization failure and recovery

No authz changes. Presentation only; every server check stays as-is.

## Proof and documentation

Per wave: visual QA checklist run per touched screen (09 checklist),
keyboard-only walkthrough, existing browser specs green, typecheck/
lint/builds clean. Learning notes NOTE-UI-000..003. Live localhost
review instead of screenshots.

## Out of scope and open gates

Dark mode; behavior/policy/data changes; new routes or roles;
design-preview; upstream applicant/admissions restyle areas (already
theirs — do not rework).

## Completion

Pending; see VERIFICATION. Human review pending.
