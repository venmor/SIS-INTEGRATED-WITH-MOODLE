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

## UI-FIELD-001 — Form field (`src/Field.tsx`, server)

| Field | Contract |
|---|---|
| Purpose | One labelled input with help and per-field error for any form |
| Allowed contexts | Sign-in, recovery, application, registration and request forms |
| Explicit non-uses | Placeholder-only labelling (never); password entry (use UI-FIELD-003) |
| Anatomy | Persistent label + optional help + input + optional error |
| Content rules | Sentence-case labels; help states format, not secrets |
| States | Default, focus (blue ring), filled, error (red border + message), disabled native |
| Interaction | Native input (managers + paste never blocked); error `role="alert"`, `aria-describedby` links help + error |
| Validation | Display-only; validation lives in the form/API |
| Error/recovery | Keeps entered value; valid entries preserved on resubmit |
| Accessibility | Label `for`/`id`; AA text; keyboard native |
| Responsive | Max 28rem; single column |
| Data/audit | Persists/logs nothing |
| Acceptance tests | Label association, error announcement, value retention |

## UI-FIELD-003 — Password creation and sign-in field (`src/PasswordField.tsx`, client)

| Field | Contract |
|---|---|
| Purpose | Secure authentication without painful recovery (§14.7) |
| Allowed contexts | Sign-in password; new-password on recovery/reset |
| Explicit non-uses | Non-secret text; PIN/code entry |
| Anatomy | Label + password input + show/hide (accessible label) + caps-lock warning + policy guidance + error; forgot-password route lives on the sign-in page, not in this component |
| Content rules | Policy guidance from config (never hardcoded minimums); approved failure copy owned by AUTH-SIGNIN-001 |
| States | Hidden/shown, caps warning (non-blocking), error, focus ring |
| Interaction | Paste/managers allowed; toggle `aria-pressed`; caps via CapsLock detection |
| Validation | Display-only; policy enforced server-side |
| Error/recovery | Value preserved after unrelated errors; reset-link-expired explains + offers fresh request |
| Accessibility | Toggle labelled `Show/Hide <label>`; warnings `role="status"`; errors `role="alert"` |
| Responsive | Same block pattern |
| Data/audit | Persists/logs nothing; value never logged |
| Acceptance tests | Toggle works by keyboard; caps warning appears; username preserved after failure |

## UI-ACTION-001 — Buttons (`src/ActionButton.tsx`, client)

| Field | Contract |
|---|---|
| Purpose | One clear primary step per task region (§14.21) |
| Allowed contexts | Form submits, callouts, empty-state actions |
| Explicit non-uses | Icon-only important actions; destructive beside primary without separation |
| Anatomy | Label (action + object) + optional progress text |
| Content rules | `Sign in`, never `Continue`/`OK`; tertiary for low-emphasis navigation |
| States | Primary/secondary/tertiary/destructive; loading shows progress text, blocks repeats, announces via `role="status"`; never disabled-without-reason |
| Interaction | Native button, keyboard native, visible focus ring, touch target ≥2rem |
| Validation | n/a |
| Error/recovery | Failed submit returns focus path via form error summary |
| Accessibility | `aria-disabled` while pending; progress announced |
| Responsive | Full-width permitted on narrow screens |
| Data/audit | Persists/logs nothing |
| Acceptance tests | Single primary per region; loading announces; no icon-only primaries |

## UI-ERROR-001 — Error summary (`src/ErrorSummary.tsx`, client)

| Field | Contract |
|---|---|
| Purpose | Page-level failure list linking to fields (§16.3) |
| Allowed contexts | Any validated form |
| Explicit non-uses | Success content; field-level-only errors |
| Anatomy | Title + linked list; auto-focus on appearance (`tabIndex=-1`) |
| Content rules | Counts corrections ("We need N corrections…"); five-part errors (§16.1) |
| States | Rendered only when errors exist |
| Interaction | Links jump to fields; focus moves here on submit failure |
| Validation | Display-only |
| Error/recovery | Valid entries kept by the owning form |
| Accessibility | `role="alert"`; labelled by title |
| Responsive | Same block pattern |
| Data/audit | Persists/logs nothing |
| Acceptance tests | Focus lands here on failure; every link targets a field |

## UI-CONTEXT-001 — Workspace context bar (`src/ContextBar.tsx`, server)

| Field | Contract |
|---|---|
| Purpose | Shows the active role, scope and academic period (catalogue) |
| Allowed contexts | Authenticated staff surfaces, above the working area |
| Explicit non-uses | Navigation; permission decisions (display mirrors server state) |
| Anatomy | Single line: role workspace · scope · period (period only when known) |
| Content rules | Words carry state; colour never carries meaning alone (19.7) |
| States | Rendered only when a workspace is active |
| Interaction | None (read-only; switching lives in the owning form) |
| Validation | Display-only |
| Error/recovery | n/a |
| Accessibility | `role="status"`; labelled with the full active context |
| Responsive | Same block pattern |
| Data/audit | Persists/logs nothing |
| Acceptance tests | Header facts match `/me` activeWorkspace after every switch |

## UI-DENIED-001 — Access denial (`src/DeniedPanel.tsx`, client; detail UI-ACCESS-001 §14.34)

| Field | Contract |
|---|---|
| Purpose | Blocked action with minimum safe reason + safe routes (§16.4, ERR-PERM) |
| Allowed contexts | Any authorization denial (never validation errors — those stay UI-ERROR-001) |
| Explicit non-uses | Bare `403 Forbidden`; existence oracles; user blame |
| Anatomy | Not-completed statement + reason + 4 routes (switch workspace, ask administrator, return to permitted work, service-desk reference) + focus on appear |
| Content rules | Reason text comes from API templates; reference appended when supplied |
| States | Rendered only on denial; attention tint distinguishes denied from error/empty/loading |
| Interaction | Route links; focus moves here on each new denial |
| Validation | Display-only |
| Error/recovery | Owning form keeps valid entries |
| Accessibility | `role="alert"`; labelled "Access denied" |
| Responsive | Same block pattern |
| Data/audit | Persists/logs nothing |
| Acceptance tests | Denied matrix shows panel (not summary); no hidden-record disclosure |
