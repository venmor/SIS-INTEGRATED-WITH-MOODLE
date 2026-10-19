# Our governed programme catalogue slice

Date: 17 October 2026. Status: written design approved by the user on 17 October 2026; implementation has not started. This is not institutional policy or human acceptance. Our implementation lead is Charles Hangoma and our proposed reviewer is Chitundu Milimbo. These assignments do not record their signoff.

## Our outcome

We let staff create a new programme and its first admissions intake through the SIS. An academic author saves its programme, entry requirements and initial curriculum configuration. A different academic reviewer approves the exact version. An admissions publisher prepares the intake and publishes it. A prospective applicant then finds the programme in the existing discovery interface and starts a real saved application.

We keep the existing modular monolith, Next.js, NestJS, PostgreSQL/Prisma, TypeScript contracts and shared UI components. We use generated demonstration records. We need no new package, paid service, downloaded university dataset or Moodle write for this slice.

## Our source basis and existing behavior

We follow the approved v2 operating-SIS specification of 2 October and its institution-configuration workstream; exact Design Sections 4 and 6; Programme Coordinator/HoD Blueprint 5 Part 2; applicant programme-discovery and application journeys; permission, security, recovery and UI records. The supersession register and institutional-authority gap remain controlling. We must finish the task-linked complete source-reading checklist in our task packet before product-code edits.

Our current catalogue reads Programme, ProgrammeOffering and RequirementRule. It has no staff authoring workflow. Our existing institution-setup editor owns structure and calendar only. Our catalogue queries currently treat stored programme/offering records as public: putting drafts there would expose them through search, detail, comparison and guidance. Our applicant service independently refuses unsupported fee/requirement policy, closed intakes and expired deadlines, and fingerprints requirements for saved applications. Our student conversion resolves a published curriculum; a catalogue label alone is insufficient preparation for that handoff.

The new workflow must work with those consumers. We cannot call publication complete merely because a programme title appears in discovery.

## Our selected approach

We use a private, versioned catalogue proposal store and project the initial public records only after approval and publication. We considered adding draft status directly to Programme/ProgrammeOffering, which would require every existing public consumer to implement a new visibility rule. We also considered extending the seed scripts, which would still require developer intervention. We choose the separate proposal store because it makes draft privacy explicit and keeps legacy published programmes intact.

Our initial slice creates a new programme and its first intake. We do not edit or repurpose an existing programme, reopen an existing intake, migrate continuing students, implement degree audit/progression rules or claim a complete accreditation process. Those require later version/change workflows. We refuse duplicate programme codes and intake identities with a useful correction. Published records and their lineage cannot be deleted or edited through this workflow.

## Our demonstration authority policy

We propose the synthetic policy identifier `DEMO-CATALOGUE-2026.1`. It is a final-year-project demonstration contract, not an assertion about UNZA's current approval bodies. Our production authority gap remains open.

We use the existing `DOMAIN_ADMIN` role with exact `SYSTEM:DEMO-UNIVERSITY` appointments and three independent capabilities:

| Staff responsibility | Capability | Permitted actions |
| --- | --- | --- |
| Academic author | `catalogue-demo-propose` | Read scoped source options; save a programme version; submit it for academic review; prepare a successor after changes are requested |
| Academic reviewer | `catalogue-demo-approve` | Review a submitted version; approve it or request changes with a reason |
| Admissions publisher | `catalogue-demo-publish` | Read an approved academic version; save its first intake configuration; publish the exact approved/configured bundle |

We provide separately generated people and accounts for these responsibilities. The author, approving reviewer and publisher must be different people as well as different accounts. A second account for the same person cannot satisfy independence. Holding another Domain Administrator, coordinator, admissions or system-administrator appointment grants none of these capabilities automatically. We do not add capabilities to an existing user's unrelated appointment.

Every read and write checks the selected live session/assignment, account, person, exact scope, capability, effective dates and revocation. Our server requires the existing explicit institution-demo setup switch, DEMO_MODE and the existing isolated-local or exactly pinned cloud-demonstration target gate. Ordinary production targets remain denied. School/campus/period selections must belong to the current activated synthetic institution profile; role titles or free-text organisational names cannot introduce foreign scope.

Academic approval and publication each require an explicit reviewed declaration and fresh password reconfirmation using the existing bounded verification pattern. We record `DEMO_PASSWORD_RECONFIRMATION`, never MFA or an institutional digital signature. We rate-limit password attempts. We verify outside a long-held transaction where possible, then lock and recheck the credential/session/assignment and exact command state before commit. Passwords and authentication tokens never enter stored command payloads, logs, browser recovery storage or audit metadata.

## Our academic proposal

We show four concise editor sections: Programme details, Entry requirements, Curriculum, and Review. Advanced source/provenance details are expandable.

Programme details contain a stable code; title; award level; duration; overview; owning academic unit; optional contributing unit references; owning office; and intended effective intake/period. Schools, campuses and periods come from the activated setup version. We preserve source IDs and its activation reference, rather than infer relationships from a school name. Our public string fields are projections of those explicit selections.

Entry requirements use a typed palette supported by the current applicant workflow. Staff select supported qualification routes, subject requirements, grade thresholds, mandatory/recommended meaning, verification and evidence instructions. Subject names/keys come from the server's existing supported subject registry, so changing a display label cannot break result matching. Grade thresholds use the supported lower-is-better scale. We require at least one explicit rule for every offered route. We do not allow executable expressions, arbitrary unsupported field operators, or a document category that the application form cannot actually collect. Unsupported combinations produce field-linked corrections before submission or approval.

Staff select an existing supported demonstration admissions/fee policy from a server-provided registry. The saved proposal retains its exact version and fingerprint. We do not accept an arbitrary fee-reference string and hope it passes the applicant service's current legacy prefix check. The publication adapter must prove that the new listing is supported by the applicant service. The existing legacy policy path remains compatible and fail-closed.

Curriculum configuration explicitly reuses published synthetic curriculum/course source material. Staff select the initial course package and applicable course requirement/period fields supported by the current registration model. The server validates course identities, duplicates, credits/load representation and prerequisite references, and retains the source snapshot. We create the new programme's initial published curriculum only after the approved bundle is published. Reusing a course does not duplicate its institutional identity, change its definition or activate a draft delivery offering. Our UI states the supported initial-registration scope; it does not imply that this increment implements every award, elective-group, supplementary or progression rule in the handbook.

Saving appends an immutable version with reason, digest, expected preceding version, source fingerprints and actor lineage. A separate Submit for review command freezes its review target. Returning a version records the review decision and reason. A correction creates a successor, preserving the returned record. Approval applies only to the current submitted version and its exact digest; a stale tab cannot approve an earlier version after a successor is submitted.

## Our intake and publication

After academic approval, the admissions publisher saves the first intake configuration: intake label/code; campus; delivery mode; application opening and closing timestamps displayed in CAT; teaching-period reference; planned places; public contact/status wording; and the approved academic version/decision reference. Planned places describe intake planning, not remaining seats or an automatic offer guarantee. Applications may exceed planned places; selection and offer-capacity enforcement remain owned by admissions decision workflows.

The publisher cannot edit approved academic content. Academic changes require a successor and another academic review. Intake saves are also immutable versions; changed dates/campus/mode produce a new intake draft and invalidate a previously prepared publication command.

We support immediate publication and publishing a future application window. We add an explicit opening timestamp for new offerings and compute effective availability from stored availability plus opening/deadline at read and command time. We apply the same window interpretation to discovery detail/search/compare/guidance and application start/change/save/submit. A future opening cannot accept an early direct API request, and a passed deadline cannot remain actionable merely because stored availability says OPEN. Legacy offerings retain their existing null-opening semantics, with their deadline still respected. We do not depend on a continuously running Vercel scheduler for this transition.

Before publication, we show the exact public preview, curriculum/course summary, entry rules, fee-policy reference, dates, reviewer, source freshness and explicit blockers. We recheck the original author and approval authority, the latest academic/intake versions, active setup/source fingerprints, credential and all required dependencies. A source change requires revalidation and a new reviewed version; we do not silently substitute the newest curriculum, policy or unit.

Publication commits the public Programme, first ProgrammeOffering, RequirementRule rows, initial CurriculumVersion/CurriculumCourse rows, immutable publication receipt, audit and owned outbox event in one transaction. Their source version/publication IDs remain linked by foreign keys or equivalent validated source references. A projection failure rolls the entire transaction back. Public search never sees a partial programme or a draft. Existing applications, programmes, requirements, curricula, registrations, results and Moodle mappings remain unchanged.

The event records catalogue publication and any pending owner handoff. It is not evidence that email, SMS, Moodle courses, teaching schedules, registrations or admission offers were created. Our receipt links to the real new public offering.

## Our persistence and API boundaries

The Catalogue module owns the workflow; Institution Setup remains the owner of structure/calendar source material. We reuse Identity Access, audit, request guards and outbox patterns without creating a general configuration writer.

We expect additive private models for a stable catalogue proposal, immutable academic versions, submitted/review decisions, immutable intake drafts and publication receipts. Unique keys cover proposal/version, exact decision target, first public programme code/intake identity, actor/request reference and publication lineage. SQL protects immutable payloads and decision/receipt history. Status is derived from authoritative version/decision/publication records or updated only through the validated domain transaction; public records are not the working draft store.

Our staff API sits under `/catalogue/authoring`. It provides permission/source options, bounded proposal/history pages, exact private preview and owner commands for Save, Submit, Review, Save intake and Publish. We keep public `/catalogue/*` contracts compatible except optional timing/source metadata needed by the new window semantics. All staff responses are no-store; private identifiers have neutral denied/not-found behavior. Collection queries apply actor/scope/filter predicates before limiting records.

We use server-side search, state filtering and deterministic date/ID ordering with bounded pages. Cursor validation binds the traversal to the current account, assignment, scope, filters and ordering. An invalid or stale cursor provides a safe restart while preserving an unsaved editor. Public discovery retains its existing bounded pagination contract.

Every mutation has a client UUID reference and a canonical digest bound to actor/assignment, target/version, action and policy. A matching replay returns its exact receipt; another payload or context cannot borrow that reference. Publication uses a database lock and uniqueness constraints so concurrent attempts create at most one first programme/intake. We retain the existing record on a competing-code conflict rather than merge two proposals automatically.

## Our UI and recovery

We add Programme catalogue to the existing staff sidebar only when the selected workspace's API reports current catalogue authority. Its landing page shows scoped counts, search, state filters and a table with programme, owner, intake, status, latest action and next step. We use the existing emerald sidebar, independent scrolling, account footer, cards, icons, form controls and loading buttons. Direct sign-in resolves a catalogue-only appointment to this workspace rather than forcing the chooser or an unrelated setup page.

Private review pages show the exact version, source/impact summary and next permitted action. We provide a clearly marked private public-page preview. Its link cannot be mistaken for a public listing, and it cannot start an application. The publication receipt links to the actual discovery detail once projection commits.

We show field-level errors with an error summary, reveal a collapsed section containing an error, focus the relevant control, retain entered values after ordinary failures and show pending states. Long course/rule selections support search and bounded pages without dropping choices on another page. We test keyboard access, narrow screens and no horizontal overflow.

After an uncertain review/publication response, we retain the nonsecret command UUID and exact frozen payload, prohibit a competing action, and offer Check status and same-reference retry. Recovery is bound to the same account/assignment and target; a different account, scope or modified payload cannot reconcile it. Tab recovery storage never contains passwords or applicant/student records. A new session requires fresh authentication and live authorization; if custody cannot be recovered, we show the retained reference and responsible office. Confirmed success shows a receipt, not merely a cleared form.

## Our demonstration and acceptance evidence

We supply generated academic-author, academic-reviewer, admissions-publisher and applicant accounts with clear local/deployed login instructions. Our setup prerequisite uses the existing governed synthetic institution workflow. Provisioning adds only matching generated actors and refuses credential/appointment drift; it never overwrites passwords, resets a shared database or auto-invents human approval.

Our representative programme/intake names, requirements, campus, dates and course choices are configurable in the UI. We do not hard-code a named university or assume a fixed school/department hierarchy. We maintain one environment-level demonstration notice and internal provenance, rather than prefix every public title with Fictional/Test.

Our slice exits only after all of the following have fresh evidence:

1. An author saves and submits a real private proposal. Anonymous search/detail/compare/guidance/application APIs cannot discover or use it.
2. A student, unrelated staff role, wrong-scope/expired/revoked appointment, and alternate account for the same person cannot review or publish it.
3. An independent academic reviewer can approve the exact current version; request-changes and successor review preserve history. Bad password, stale digest/version, changed source and expired original authority refuse the command.
4. The publisher configures an intake and publishes it atomically. Concurrent publish/code collisions, partial projection failure and lost-response same-reference recovery preserve one valid result.
5. The programme appears in the actual existing discovery search/detail/compare/guidance routes. An existing supported applicant account starts and saves an actual application using the new offering and exact requirement fingerprint.
6. Future opening and closing/deadline behavior agree across public reads and every relevant applicant command. Direct API requests cannot bypass dates. Unsupported entry rules/fee policies cannot yield a public but unusable listing.
7. Existing admissions applications, assigned curricula, student logins, registrations, results, timetables and legacy catalogue fixtures continue to work. New publication does not create a Moodle enrolment or alter official student records.
8. The actual staff-to-applicant browser story passes on an isolated PostgreSQL database, including mobile/keyboard/accessibility and recovery checks. Migration, backup/restore, typecheck/build, configured lint and relevant regression checks pass; unrun human/institutional checks remain explicit.

## Our delivery boundary

We implement and verify locally before merging or deploying. The user already authorised merge/push/deployment after completed work; we do not ask again for that same release action. Cloud enablement still requires a verified target, a private backup and reviewed additive migrations. Our 17 October inventory found the existing cloud database at 77 successful migrations versus 79 in merged source, with a retained historical conversion checksum difference and its later integrity repair. We must reconcile that known migration baseline before adding this slice's cloud migration; we never rewrite checksums to force a green deployment.

The user approved this concrete written design. We can now prepare the detailed implementation plan under the required planning workflow. That approval does not mark the feature implemented, grant institutional approval, change source handbook text or certify the complete SIS.
