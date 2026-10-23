# Supervisor engineering diagrams

We inspected the `v2-student-presentation-and-core-20261015` worktree, including its pending changes, on 16 October 2026. We use these diagrams to describe selected current implementation paths. We distinguish this implementation evidence from institutional acceptance and live Moodle enrolment.

We provide editable Mermaid (`.mmd`) and Graphviz (`.dot`) sources, a vector SVG and a PNG for each diagram. **We rendered the images locally from the companion Graphviz source**, using `dot` or fixed-position `neato`. We express the same logical views in the Mermaid sources, which we have not passed through a Mermaid renderer. We used the available local tools without downloading a renderer, building the application or editing application source.

| Filename | View | Ready-to-use artifacts |
|---|---|---|
| `01-system-context-components` | System context and component architecture | [PNG](01-system-context-components.png) · [SVG](01-system-context-components.svg) · [Mermaid](01-system-context-components.mmd) |
| `02-registration-moodle-sequence` | Registration and the Moodle handoff sequence | [PNG](02-registration-moodle-sequence.png) · [SVG](02-registration-moodle-sequence.svg) · [Mermaid](02-registration-moodle-sequence.mmd) |
| `03-domain-class-model` | Selected domain classes and actual reference types | [PNG](03-domain-class-model.png) · [SVG](03-domain-class-model.svg) · [Mermaid](03-domain-class-model.mmd) |
| `04-timetable-publication-activity` | Governed fictional timetable publication activity and state labels | [PNG](04-timetable-publication-activity.png) · [SVG](04-timetable-publication-activity.svg) · [Mermaid](04-timetable-publication-activity.mmd) |
| `05-design-class-boundaries` | Selected implementation classes and constructor dependencies | [PNG](05-design-class-boundaries.png) · [SVG](05-design-class-boundaries.svg) · [Mermaid](05-design-class-boundaries.mmd) |

We recommend SVG when the document workflow preserves vector graphics, and PNGs at their original aspect ratio otherwise. We give the registration sequence, domain classes and design classes dedicated landscape pages; we use a portrait view for the timetable publication activity. We use the contact sheet to review layout and inspect the full-resolution diagrams separately.

We also provide the [Engineering Diagram Atlas](../SIS-Moodle-Engineering-Diagram-Atlas.pdf), with vector pages sized to each diagram's natural canvas for zooming and printing. We order the atlas as system context, registration sequence, domain classes, design classes and timetable publication activity. We retain the original artifact filenames above; their numeric prefixes do not define the atlas or report figure order.

## Accuracy and reading conventions

- **One modular monolith:** we show the Nest modules as logical components within one API application, Next.js as the separate web application and PrismaService as the shared persistence boundary.
- **Registration first:** we show the registration transaction recording its official snapshot, roster, receipt, audit, command result and `MoodleEnrolmentQueued` event. We show Moodle processing separately and distinguish queued work from successful external delivery.
- **Current simulator and deferred live writes:** we trace the runnable automatic Moodle path through `SimulatorAdapter` and PostgreSQL simulator mirrors. We show `liveDeliveryDeferral()` refusing automatic live delivery before claims, preserving queued sources and registration. We distinguish `LiveMoodleAdapter`'s guarded connection validation from its write/scope operations, which currently refuse the missing prerequisites. We also record that worker timers do not start when `VERCEL` is set.
- **Two different offerings:** we distinguish the admissions/programme `ProgrammeOffering` from the period-bound `CourseDeliveryOffering` behind `TeachingSection`. We show the current Moodle `SHELL` mapping as `ProgrammeOfferingId:periodCode` and preserve that mapping's actual scope.
- **Domain solid versus dashed lines:** we use solid associations for declared Prisma relationships, with multiplicities checked against the schema, and dashed associations for scalar or polymorphic keys resolved by services. We identify `InstitutionalRegistration.attemptId` and `.periodId` as scalar keys without declared Prisma relations, and `MoodleMapping.sisId` as polymorphic without a direct offering/account FK. We select model fields and relations for readability rather than presenting an exhaustive ERD.
- **Published delivery bridge:** we show `CourseRegistration` pointing to `Course` and `TimetableStudentSession` retaining the published bridge to the course registration, programme attempt and delivery identities. We omit several additional source FKs from that box for readability and retain their definitions in the schema.
- **Publication is explicitly fictional:** we show corrections to immutable blocked drafts through new versions. We trace the atomic append through current authority, independent-person approval, password reconfirmation, digest/predecessor/source checks and late expiry checks. We derive current/superseded status from publication order. We also show exact-receipt recovery on retry, including the possibility that a historical receipt has been superseded.
- **Notification ownership:** we show publication creating the durable owner event and separate current notification processing creating deduplicated in-system notices for entitled own accounts. We retain the explicit `externalDelivery: NONE` boundary.
- **Selected design graph:** we show real class names and selected actual constructor injections in the design class diagram. We omit further dependencies, including the worker's SchedulerRegistry injection and FinanceService's own dependencies, from this selected graph. We use dashed adapter arrows for selection or interface realization. We use the actual timetable class names found in the implementation.

## Source map

| Concern | Current source inspected |
|---|---|
| Application components | [AppModule](../../../apps/api/src/app.module.ts), [RegistrationModule](../../../apps/api/src/registration/registration.module.ts), [IntegrationModule](../../../apps/api/src/integration/integration.module.ts), [TimetablingModule](../../../apps/api/src/timetabling/timetabling.module.ts), [NotificationsModule](../../../apps/api/src/notifications/notifications.module.ts) |
| HTTP registration and actual service dependencies | [RegistrationController](../../../apps/api/src/registration/registration.controller.ts), [RegistrationService](../../../apps/api/src/registration/registration.service.ts), [RegistrationContextsService](../../../apps/api/src/registration/registration-contexts.service.ts) |
| Registration atomic command and handoff | `registration.service.ts`: `command()` around line 417; `submitRegistration()` around line 931; snapshot/roster/outbox/audit around lines 1096–1194; current status and timetable projection around lines 1222–1560 |
| Delivery and mapping semantics | [IntegrationService](../../../apps/api/src/integration/integration.service.ts): `shellFor()` around line 783; `deliverEnrolment()` around line 1058; `runWorker()` around line 1217; [IntegrationController](../../../apps/api/src/integration/integration.controller.ts), [DeliveryWorker](../../../apps/api/src/integration/delivery.worker.ts) |
| Current live/simulator boundary | [MoodleAdapter and liveDeliveryDeferral](../../../apps/api/src/integration/moodle-adapter.ts), [SimulatorAdapter](../../../apps/api/src/integration/moodle-sim-adapter.ts), [LiveMoodleAdapter](../../../apps/api/src/integration/moodle-live.ts), [backend selector](../../../apps/api/src/integration/moodle-live-config.ts) |
| Domain classes and cardinalities | [Prisma schema](../../../prisma/schema.prisma): Person/Account/RoleAssignment near lines 11–120; Student near 847; ProgrammeAttempt/CurriculumVersion/AcademicPeriod near 1028–1083; MoodleMapping near 1391; Course near 1641; course delivery near 1778–1830; InstitutionalRegistration/CourseRegistration near 1973–2003; published bridge near 2563 |
| Fictional timetable creation and decision | [MasterPreviewController](../../../apps/api/src/timetabling/master-preview.controller.ts), [MasterPreviewService](../../../apps/api/src/timetabling/master-preview.service.ts), [TimetablePublicationService](../../../apps/api/src/timetabling/publication.service.ts), [current timetable authority](../../../apps/api/src/timetabling/timetable-authority.ts), [shared source validator](../../../apps/api/src/timetabling/master-validation.ts) |
| Separate in-system notification owner | [NotificationsService](../../../apps/api/src/notifications/notifications.service.ts), [NotificationsWorker](../../../apps/api/src/notifications/notifications.worker.ts), [timetable owner consumer](../../../apps/api/src/notifications/timetable-notifications.ts) |
| Scope and maturity boundary | [TIME-007 packet](../../task-packets/TASK-V2-TIME-007.md), [Moodle deferral note](../../learning/NOTE-V2-MOODLE-001.md), [notification packet](../../task-packets/TASK-V2-NOTIFY-001.md) |

## Reproduce and review

We reproduce the diagrams from this worktree root with:

```sh
/home/hangoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python development/docs/supervisor/diagrams/render_diagrams.py
```

We use the generator to write these diagram sources and images. We keep the sequence participants and message rows fixed with `neato -n2`. We rendered all five SVGs and PNGs, checked their dimensions and image integrity, and inspected layout through a contact sheet and full-image review. We also obtained an independent read-only audit of current-source cardinalities and constructor links. We treat these source-level accuracy checks separately from application tests, screen-reader review and human acceptance.
