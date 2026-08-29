# Document Arrangement and Maintenance Rules

## Stable locations

- Project-wide non-negotiables: root `AGENTS.md`
- Human start/navigation: root `START-HERE.md` and `MASTER-CONTENTS.md`
- Approved journeys: `03-USER-EXPERIENCE-BLUEPRINTS`
- UI, permission, architecture, security and tests: their numbered subject folders
- AI task/handoff rules: `09-AI-AGENT-OPERATING-MANUAL`
- Release sequence: `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP`
- Decisions/coverage/changes: `90-TRACEABILITY-AND-GOVERNANCE`
- Exact recovered source: `99-EVIDENCE-ARCHIVE`

## Future application repository

Do not copy the full evidence archive into every code module. The future repo should keep short root/module `AGENTS.md` files, architecture overview, ADRs, approved-design links, task packets, module READMEs and traceability. Detailed evidence remains a reference package.

## Editing rules

- Preserve stable IDs and links.
- Record status/version/date/approver for controlling changes.
- Update all affected journey, permission, test and roadmap links together.
- Do not duplicate policy text across modules; reference the controlling configuration/specification.
- Archive superseded versions; do not silently rewrite the history.
- Run link, inventory and checksum validation before publishing a new handbook release.
