# GAP-008 — Notification delivery, templates, retry (v0.9)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

§12.9 requires notifying the person on grant; REQ-OPS-001 requires template
version/recipient/payload/channel/status records; no template IDs, channel
policy, or Notifications service exists (open production decision covers
delivery providers).

## Why it blocks or risks implementation

Inventing template IDs or an SMTP/SMS send would fabricate providers.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

REQ-OPS-001/002, grant flow, OutboxEvent consumers.

## Bounded options and consequences

Outbox event carries recipient + safe payload durably (slice 4); service,
templates, retry/dead-letter UI in v0.9 hardening.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11), v0.9 plan.
