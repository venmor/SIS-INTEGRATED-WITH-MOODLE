# UI-008 — Information design across the student entry journey

Lead Charles Hangoma; reviewer Chitundu Milimbo. User-directed continuation of the approved v2 interface, 12 October 2026. Human visual acceptance remains pending.

Authority: exact Section 19 Part 1; Section 12; cross-blueprint Part 2A; Student Blueprint 2 Parts 1/4; UI-003/005/006; ADR-003. Existing task, input, status, record and review components remain the contract. User explicitly requests structured information throughout workflows, not only a coloured shell.

Scope: isolated UI worktree; sign-in/public discovery orientation, student home task hierarchy, registration step navigation, readiness conditions, bounded searchable/sortable course selection, responsive course review/receipt table. A route-pattern inventory records every current screen family and further review needed. No fake charts, counts, controls, completion status or policy changes.

Preserve all current sign-in, query context, input validation, draft version, official submit, uncertainty recovery, server authorization and audit semantics. Academic steps communicate location only, never certify a prior step complete. Display source-owned readiness values with plain labels and retain detailed explanations. Course filtering/sorting/paging operates on the already-authorised available plan inventory and must not discard selections when changing pages. Plan load and validation remain explicitly last-saved until the server responds.

Out of scope: backend/schema, institution approval, role grants, providers, deployment/Git integration, data imports, universal completion claim. No downloads or dependencies.

Acceptance: scoped lint/typecheck/build; browser sign-in/discovery/readiness/course review at desktop and 390px; keyboard step/menu/control access; search/sort/paging preserves selection; existing registration recovery/deny scenarios remain intact. Document exact evidence and limitations.
