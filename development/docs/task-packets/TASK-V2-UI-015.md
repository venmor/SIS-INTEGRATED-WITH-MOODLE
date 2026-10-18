# UI-015 — Public SIS homepage from supplied image

Date: 18 October 2026. Lead Charles Hangoma; reviewer Chitindu Milimbo. The user supplied `/home/hangoma/Pictures/sis_home_page.png` and requested that the existing public homepage be transformed to match it after UI-014. Human visual acceptance remains pending.

Scope: `/` public entry only, a home-specific sign-in presentation, responsive CSS and local image assets. Keep the existing authenticated root redirect, session-unavailable state, same-origin sign-in command, server-selected workspace, password visibility, account recovery, and demo-account gate. Student/Staff tabs change guidance only; they cannot select or grant a role. The supplied screenshot's persistent-session checkbox is omitted because the current authentication contract offers no approved per-device persistence choice. The demo entry is displayed only when `DEMO_MODE=true` and identifies fictional credentials. Footer links point to implemented routes.

Visual implementation: white university header with crest, landscape campus image, left SIS introduction, white sign-in panel and compact footer. The crest is downloaded from the University of Zambia application host (`https://koap.unza.zm/images/unza-logo.png`). The campus background is an AI-generated image based on the user-supplied visual reference; it is not claimed to document an actual UNZA campus building. The image and crest are local public assets so the page does not rely on third-party requests at runtime.

Authority: TASK-V2-UI-006 for direct SIS sign-in and separate programme discovery; UI Constitution Section 19 Part 1 and security/authentication controls remain controlling. No backend, session policy, role permission or institutional endorsement changes.

Verification: isolated Next production build, browser render at 1672×941 and 390×844, interactive tab/password/recovery checks, browser error/overflow inspection, and visual comparison with the supplied reference. See `apps/web/design-qa.md`. Connected authentication and human approval remain separate gates.
