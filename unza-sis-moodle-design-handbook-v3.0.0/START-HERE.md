# Start Here

## What this package is

This directory is the ordered handbook for understanding and implementing the SIS–Moodle project. It turns the recovered design chat into human-readable, AI-loadable Markdown documents. The containing repository also has an [application workspace](../development/README.md).

## What this package is not

The handbook directory is not executable application code. Its original documentation ZIP did not contain a runnable scaffold. Application development now lives in the sibling `development/` directory; read its current task packets and verification records before claiming a feature or phase is complete.

## First reading session — both developers together

1. Read this file and `PROJECT-STATUS.md`.
2. Read `00-ORIENTATION/01-purpose-audience-and-boundary.md`.
3. Read the master report in `01-FINAL-PROJECT-REPORT/`.
4. Review the journey for the first planned vertical slice in `03-USER-EXPERIENCE-BLUEPRINTS/`.
5. Read the UI, permission, architecture, security and acceptance documents linked by that journey.
6. Read `08-ENGINEERING-DELIVERY/` and `09-AI-AGENT-OPERATING-MANUAL/` before asking an AI agent to prepare code.
7. Follow the numbered roadmap in `11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/`.

## Authority order

When documents appear to conflict, use this order:

1. A later approved decision or supersession record
2. Security, privacy, permission and official-record integrity rules
3. Exact approved design evidence in `15-APPROVED-DESIGN-EVIDENCE/`
4. Curated journey and subject handbooks
5. Templates and examples

Examples are illustrative unless explicitly marked as approved policy. A programme rule, fee, grade boundary, role authority, provider identifier or deadline must be confirmed through versioned configuration before implementation.

The evidence directory contains active implementation requirements. Read the individual records linked to the task; its new name and [SUP-012](90-TRACEABILITY-AND-GOVERNANCE/SUPERSESSION-REGISTER.md) remove earlier wording that could suggest these requirements were optional historical material.

## Before any coding task

Create a task packet from `14-TEMPLATES/TASK-PACKET.md`. The packet must identify the requirement, role, screen, action, permission, command/event, failure/recovery behaviour, tests, developer lead, reviewer and out-of-scope list. If a required answer is absent or contradictory, create a design-gap record; do not guess.
