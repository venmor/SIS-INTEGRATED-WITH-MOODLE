# UI

Approved reusable UI primitives. Tokens: `src/tokens.css` (proposed UNZA palette + spacing/type/radius/focus — requires institutional approval, see `tokens.css` header). Every component below carries its §14.2 contract; a use outside the contract needs design approval.

## UI-STATUS-001 — Status explanation (`src/Status.tsx`, server)

| Field | Contract |
|---|---|
| Purpose | Answer “what is happening + what do I do now” for any record/task state |
| Allowed contexts | Record pages, home milestones, shell/liveness states, form save states |
| Explicit non-uses | Marketing banners; decorative badges; colour-only dots without text |
| Anatomy | State (strong) + optional reason + last-updated + owner + next action |
| Content rules | 19.10: state, reason, update, owner, next action; sentence case; never bare “Pending” |
| States | `neutral/info/success/attention/warning/error` → left-border + tinted bg; text always present |
| Interaction | Static; `role="status"`; no pointer behaviour |
| Validation | Props are display-only; no validation |
| Error/recovery | n/a (informational); never the sole evidence of a high-impact completion |
| Accessibility | `role="status"`, `aria-label`=state; text colour AA on its tint; reflows to 200% zoom |
| Responsive | Full-width block, max 40rem; single column on mobile |
| Data/audit | Persists/logs nothing |
| Acceptance tests | All six severities render with text; screen-reader announces state; no colour-alone meaning |

## UI-NOTICE-001 — Notification/notice (`src/Notice.tsx`, client)

| Field | Contract |
|---|---|
| Purpose | Communicate one decision/event and its consequence with an optional action |
| Allowed contexts | Post-action confirmations, callouts, banners above a task |
| Explicit non-uses | Sole evidence of high-impact completion (receipt/timeline required); chatbot panels |
| Anatomy | Title + message (19.9: happened → means → do next) + optional action link + optional dismiss |
| Content rules | Plain language; severity matches 19.7 meanings; action names its consequence |
| States | `info/success/attention/warning/error`; `alert` role for attention/warning/error, `status` otherwise |
| Interaction | Dismiss button (keyboard-focusable, visible focus ring); action is a real link |
| Validation | Display-only |
| Error/recovery | Dismissal is local-only, never workflow evidence; underlying decision unchanged |
| Accessibility | Live role per severity; `aria-label`=title; dismiss `aria-label` names the notice |
| Responsive | Flex row → wraps; dismiss never covers content on mobile |
| Data/audit | Persists/logs nothing |
| Acceptance tests | Severity roles correct; dismiss removes only the notice; keyboard reaches dismiss + link |

## UI-EMPTY-001 — Empty state (`src/Empty.tsx`, server)

| Field | Contract |
|---|---|
| Purpose | Explain an empty area, distinguishing three cases |
| Allowed contexts | Queues, lists, timelines, search results with zero rows |
| Explicit non-uses | Permission-denial pages (use UI-DENIED-001 when it lands); loading skeletons |
| Anatomy | Title + message + optional action; `data-case` = `nothing/scoped/action` |
| Content rules | `nothing`: genuinely empty + how to add; `scoped`: visible-scope explanation, no existence disclosure; `action`: what the user must do |
| States | Three `data-case` variants; never ambiguous between empty and denied |
| Interaction | Static; optional action link; `role="status"` |
| Validation | Display-only |
| Error/recovery | n/a; scoped case must not leak hidden-record existence |
| Accessibility | `role="status"`; text AA; single column |
| Responsive | Same block pattern, max 40rem |
| Data/audit | Persists/logs nothing |
| Acceptance tests | All three cases render distinct copy; scoped copy discloses nothing |
