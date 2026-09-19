# Document Arrangement and Maintenance Rules

## Stable locations

- Project-wide non-negotiables: root `AGENTS.md`
- Human start/navigation: root `START-HERE.md` and `MASTER-CONTENTS.md`
- Approved journeys: `03-USER-EXPERIENCE-BLUEPRINTS`
- UI, permission, architecture, security and tests: their numbered subject folders
- AI task/handoff rules: `09-AI-AGENT-OPERATING-MANUAL`
- Release sequence: `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP`
- Decisions/coverage/changes: `90-TRACEABILITY-AND-GOVERNANCE`
- Active exact approved source: `15-APPROVED-DESIGN-EVIDENCE`

## Application workspace

The sibling `development/` workspace keeps short root/module `AGENTS.md` files, architecture overview, ADRs, approved-design links, task packets, module READMEs and traceability. Link each task to its exact approved evidence rather than copying the entire compendium into every module. Detailed evidence remains active and authoritative within its approval scope.

## Editing rules

- Preserve stable IDs and links.
- Record status/version/date/approver for controlling changes.
- Update all affected journey, permission, test and roadmap links together.
- Do not duplicate policy text across modules; reference the controlling configuration/specification.
- Archive superseded versions; do not silently rewrite the history.
- Run link, inventory and checksum validation before publishing a new handbook release.
- The user-authorized 2026-09-19 folder rename is recorded as SUP-012. Renaming/navigation corrections must preserve the original approved source bodies and update path references, package inventory and SHA-256 checksums together.
