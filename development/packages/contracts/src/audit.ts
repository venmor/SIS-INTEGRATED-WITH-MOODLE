/**
 * Canonical slice-5 audit-timeline shapes (TASK-PH1-005, §15.19 admin rows,
 * §14.26 timeline). The list view carries the permitted field list only —
 * purpose rides along; metadata and prior/new state diffs stay out.
 */

export interface AuditTimelineRow {
  id: string;
  occurredAt: string;
  actorAccountId: string | null;
  activeRole: string | null;
  scope: string | null;
  action: string;
  targetRef: string | null;
  outcome: string;
  reason: string | null;
  purpose: string | null;
  correlationId: string;
  errorCategory: string | null;
}

export interface AuditTimelineResponse {
  events: AuditTimelineRow[];
  total: number;
}
