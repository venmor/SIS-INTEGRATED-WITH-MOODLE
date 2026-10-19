# UI-016 — Account category restriction and consistent sign-in

18 October 2026. User-directed continuation of UI-015. Lead Charles Hangoma; reviewer Chitindu Milimbo. Human visual acceptance pending.

The Student entry accepts current APP, STUDENT and legacy STU appointments; Staff accepts other current ordinary appointments. Selection restricts server-side sign-in and chooses only an existing matching appointment, retaining same-account preference when compatible. No assignment is created or expanded. Omitted audience retains API compatibility; browser sends a category. Wrong-category credentials receive the existing generic authentication failure with an internal audited denial.

Both `/` and `/sign-in` use the modern homepage presentation. Existing authenticated root routing, validated returnTo, same-origin command, password/recovery behavior and session-unavailable handling remain. The sign-in card is vertically centered without an offset or fixed minimum height.

Demo disclosure is gated by DEMO_MODE and the existing isolated-local or explicitly pinned cloud database target validator. Exact known seed/generated fixture usernames and passwords are allowlisted. The endpoint queries only those names, requires active unmerged person/account, unlocked account, live ordinary role and verifies the known password before returning it. It never enumerates unrelated accounts or returns hashes. Student/Staff disclosure filters use the same classification as session selection. Fixture presence on a particular cloud target is not asserted until checked there.

Authority: UI-015/UI-006, exact IAM blueprint 035, exact security design section 010 and UI constitution 001. The user explicitly approved category restriction and full known demonstration credential disclosure, superseding UI-015's earlier guidance-only tabs. Official institutional authority/production gates remain open. Scope excludes integration and student workflow changes.

Verification: API no-emit TypeScript check passed. Six focused tests cover learner classification, multi-role selection, current appointment filtering, non-demo catalogue denial, password verification, fixture-only disclosure and no session creation for correct-password wrong-category attempts. Parent runs final application builds and connected browser verification after shared build artifacts are coordinated.
