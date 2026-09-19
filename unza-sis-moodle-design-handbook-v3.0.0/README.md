# UNZA SIS–Moodle Design and Development Handbook

Version: **3.0.0 — documentation baseline**  
Audience: Charles Hangoma, Chitindu Milimbo, supervisors, reviewers and future AI development agents.

This directory is the report-ready design handbook for the Student Information System and Moodle integration. It contains the recovered design, reorganized from problem and user needs through architecture, journeys, UI/UX, security, delivery, learning, testing, demonstration and controlled expansion.

The handbook directory deliberately contains **no application source code**, no runnable scaffold, no database, no credentials, no real student data and none of the earlier implementation files that appeared as attachments in the design conversation. Current application code lives separately in [development](../development/README.md).

Begin with [START-HERE.md](START-HERE.md), then follow [MASTER-CONTENTS.md](MASTER-CONTENTS.md).

[Approved design evidence](15-APPROVED-DESIGN-EVIDENCE/README.md) is part of the active requirement set. Task-linked exact records must be read alongside the curated journey and subject handbooks.

## Controlling principles

- The SIS owns identity linkage, curricula, registration, official results, progression, finance records and awards.
- Moodle owns teaching activity, submissions and provisional learning evidence; it cannot publish official SIS results.
- Every user acts through an explicit role, scope, relationship and lifecycle state.
- High-impact records are state-controlled, versioned and auditable.
- The interface follows the UI/UX Constitution and approved screen/component families.
- Institutional policy is configurable and versioned, not hard-coded.
- External effects are idempotent, retried safely and reconciled.
- AI agents work from small task packets and repository evidence, never model memory alone.
- Charles and Chitindu rotate vertical-slice leadership so both learn the full system.

## Package status

This package supports design review, report writing, task planning and bounded AI-assisted development. Each coding task still requires its entry gate; [Project Status](PROJECT-STATUS.md) distinguishes the handbook baseline from current implementation and pending review.
