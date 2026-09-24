# Learning Note — UI-POLISH Wave 3 (states, mobile, accessibility)

- Lead developer: Chitindu Milimbo (proposed; TASK-UI-POLISH)
- Reviewer: Charles Hangoma (proposed)
- Date: 2026-09-24, presentation track

## What was built and why

Route resilience and access: global skip link (root layout, `#main-content`
target on the admin shell), root + admin/applicant/student error
boundaries and a plain-language root not-found page, module-styled
loading states for finance and sign-in. Staff nav collapses natively
on narrow screens (Wave 2). ActionButton already meets 44px targets.

## Verification

- Typecheck/lint/builds clean. Full browser suite 37/37 green on a
  clean slate (see environment lesson below).

## Environment lesson (applies to all future browser runs)

Playwright reuses whatever holds :3100/:3101. Leftover live dev-DB
servers cause audit-less 401s and wrong-database reads ("Programme
not found", disabled buttons from failed fetches). Rule: kill all
`dist/main`/`next-server` processes before `playwright test`, and
never run the live host and the suite at once. Restored live servers
after verification.

## Remaining (minor, noted not hidden)

- `aria-current` on admin/applicant navs needs a client nav component.
- Existing `loading.tsx` inline-px styles predate this pass; new ones
  use modules.
