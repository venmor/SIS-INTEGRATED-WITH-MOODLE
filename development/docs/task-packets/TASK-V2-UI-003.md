# TASK-V2-UI-003 — Student portal task-first presentation

- Release: v2.0 Task 7. Lead Charles Hangoma; reviewer Chitundu Milimbo. Human visual and accessibility acceptance remains pending.
- Authority: user UI direction (2026-10-02), approved v2 operating-SIS spec §3.3, exact Student Blueprint 2 Part 1, Section 19 UI constitution, `UI-STATUS-001`, `UI-TASK-001`, `UI-LOAD-001`, and ADR-003.
- Scope: focused student navigation, a current-period registration summary sourced from the existing registration endpoint, task hierarchy, accessible small-screen layout, and progressive disclosure of profile/correction forms. No new registration decision, policy, data write, role or provider.
- A failed registration-status read must say the status is unavailable, not infer registration from the student record. Existing student-owned API permissions remain authoritative.
- Acceptance: home identifies the student and period; registered and unregistered states offer the correct next route; failed status reads do not claim completion; 390px and desktop show no horizontal overflow; keyboard/focus and reduced-motion remain usable; existing student browser journey, web build, lint and typecheck pass.
