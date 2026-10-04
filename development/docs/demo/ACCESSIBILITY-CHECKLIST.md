# Accessibility Manual Checklist (Phase 8 slice 5)

Human-run only. No result here is claimed by automation; automation
covers axe serious/critical scans, labels, focus, zoom/reflow and
slow-connection states in `tests/browser/accessibility.spec.ts`.
Each row needs a human executor, date and result before it counts
as evidence. Fictional demo data only.

## Setup (both developers)

- Production builds served locally (API + `next start`), fresh
  migrated + seeded isolated browser database.
- Desktop browser at 100% and 200% zoom; 390px-wide viewport;
  keyboard only (no mouse); one screen-reader pass (NVDA or
  VoiceOver — record which); OS reduced-motion ON for pass 5.

## Passes

| # | Journey | Do | Expect |
|---|---|---|---|
| 1 | Sign-in | Tab from address bar; activate skip link; sign in with keyboard only; fail once with a wrong password | Skip link visible on focus and lands in main; focus enters the error summary on failure; password show/hide announces state; caps-lock warning appears |
| 2 | Applicant workspace | Complete personal + contact sections keyboard-only; submit an invalid date; save | Every error links to its field and is announced; focus enters the summary; Saving/Saved wording distinguishable |
| 3 | Notifications centre | Open as student; mark a mandatory notice read | Notice announced; no mute control on mandatory; status text readable (not colour-only) |
| 4 | Ops queue | Open/ack/resolve/close one incident keyboard-only | Every transition button reachable and focus-visible; resolved evidence readable |
| 5 | Reduced motion | OS reduced-motion ON; repeat passes 1–2 | No transitions/animations; nothing meaningful lost |
| 6 | 200% zoom | Browser zoom 200% on workspace + ops queue | No horizontal scrolling; all actions reachable |
| 7 | Screen reader | Full applicant journey with SR running | One clear announcement per step; landmarks (`main`, headings) navigable; tables read with headers |

## Record

| Date | Executor | Passes | Issues (severity) | Retest |
|---|---|---|---|---|
| _pending_ | Charles Hangoma | | | |
| _pending_ | Chitundu Milimbo | | | |

Critical failure in any pass blocks release (acceptance
catalogue §Release blockers). File follow-ups as gaps; do not
mark this checklist complete from this document alone.
