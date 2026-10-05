# ADR-004 — Synthetic timetable planning as a complete, linked scenario

Date: 2026-10-05. Status: Accepted for the fictional v2 rehearsal by the user's direction to reason beyond the high-level plan; institutional adoption and human acceptance are pending. Lead Charles Hangoma; reviewer Chitindu Milimbo.

## Problem

The high-level timetable tasks list rules, resources, sessions, conflicts and publication separately. Implementing a date-entry form against free-text section or teacher IDs would produce a convincing screen without a trustworthy planning result. The current `CourseRegistration` roster is course-level, not section-level. No teaching period or student membership may be inferred from a course name, legacy tutorial text or an unreviewed seed row. A saved rule draft is not approved university policy.

## Decision

Use a **versioned synthetic planning scenario** as the first complete timetabling unit. Its source links are a configured `DEMO-*` campus, a specific saved fictional rule version, a real `AcademicPeriod`, a `CourseDeliveryOffering` and `TeachingSection`, a campus `TeachingVenue`, an active scoped teaching appointment, and an explicit set of enrolled `CourseRegistration` IDs assigned to that session. Dates use offset-bearing instants and the named `Africa/Lusaka` display zone. The server resolves every link and participant on save; the client never supplies trusted capacity, campus or teacher/student identity facts. Venue capacity, room turnaround, teacher/student overlap and inter-campus travel are checked through the existing deterministic validator. A scenario with missing links or blocking findings may be saved for correction but is never called ready. A new version is required for every change; stale writes and replay are controlled.

The user can configure fictional values through the setup screens. A seed may provide a runnable example but is never the only way to edit a rule or plan. The planner uses bounded searches/selectors, a list-based conflict review and exact next actions, not a drag-only calendar or a 20,000-row dropdown. Validation snapshots name their rule and source versions. Before any later publish command, the server must re-read current appointments, roster and resource state and reject a stale validation result. No client switch turns a hard conflict into a warning.

## Master and course preview projection

One period-wide **master draft snapshot** is the source for all previews. It contains the contributing campus/section draft versions and rule versions, with a freshness marker and conflict report across the full set. A campus scheduler may edit only appointed campus material; a separately appointed fictional central timetable coordinator may review the whole master draft. The global preview minimizes student data and may show conflicts by section/session reference, never an unrestricted roster. A course preview is a server-filtered projection of that same master version by course offering and section. It cannot be edited independently, so it cannot drift from the master. It shows dated activities, location, delivery mode, source version, conflict/readiness state and exact affected enrollment count. Staff access follows offering/section appointment; anonymous and student accounts cannot read drafts.

After independent authorized approval, publication must atomically pin one validated master version, recheck current rule, venue, teacher and explicit course/section roster links, and create student-specific projections only for enrolled members. Publication is separate from preview, and a course/student never sees a draft simply because a preview exists. A revision creates a new master version and impact comparison; the prior published version remains auditable until replacement succeeds. The preview UI therefore has master, course and conflict-list views, with list/table alternatives and server-side filters/paging.

## Alternatives rejected

- Free-text sessions and caller-supplied participant arrays: fast to render, but they can hide absent enrolment, expired appointments and false capacity.
- Automatically map all course registrations to one section: the source has no section assignment; cross-stream/shared-course schedules would be wrong.
- Publish from the draft validator: approval and student visibility have distinct authority and impact/recovery controls, still open in GAP-V2-001 and GAP-021.
- Treat a seed fixture as policy: it cannot demonstrate operator configuration or institutional authority.

## Scope and consequence

The first implementation step completes the fictional rule **draft** shape: a selected academic period, bounded teaching dates, daily hours, weekdays and session duration alongside the existing resource limits. Earlier rule versions remain immutable and are explicitly incomplete for dated planning. The linked scenario and conflict-review journey follows in a separate slice; it cannot use an incomplete old rule. The interface must label incomplete/blocked outcomes and retain exact versions. It must not change official registration, enrol anyone in Moodle, notify students, or expose draft sessions on `My timetable`. Separate authority, impact review, independent approval, publication, revision and student projection remain required to close TASK-104/105. These are explicit remaining tasks, not implicit success inferred from a green planning preview.

Sources: approved Design Section 4 (course offering/section, teaching allocation, timetabling boundary), Role Blueprint 2 Part 4 §§3, 8–11 (authoritative source, failure and student visibility), cross-blueprint permission Part 3A and draft UI Part 2B, [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md), [GAP-021](../gaps/GAP-021-real-timetable-validation.md), and the [v2 plan](../../plan/feature-sis-expansion-2.0.md).
