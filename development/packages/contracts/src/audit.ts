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

/**
 * Slice-8 entity timeline shapes (TASK-PH8-002). One workflow object,
 * every source the caller may already read, newest first. The joined
 * item carries the same allow-listed fields as the direct endpoints —
 * joined, never widened.
 */
export interface EntityTimelineItem {
  source: string;
  occurredAt: string;
  actorRole: string | null;
  summary: string;
  applicantVisible?: boolean;
}

export interface EntityTimelineResponse {
  kind: string;
  id: string;
  items: EntityTimelineItem[];
}
