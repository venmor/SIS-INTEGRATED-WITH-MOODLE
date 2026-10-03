/** Phase 8 slice 3: ops queue views (TASK-PH8-003). Generic incidents
 * over existing domain operations; the queue aggregates open work
 * with linked rows into owning queues. ISO date strings. */
export interface OpsIncidentView {
  id: string;
  title: string;
  severity: string;
  status: string;
  sourceKind: string;
  sourceRef: string;
  ownerAccountId: string | null;
  ownerRole: string | null;
  version: number;
  createdAt: string;
}
export interface OpsQueueView {
  openIncidents: number;
  acknowledgedIncidents: number;
  pendingNotificationDeadLetters: number;
  pendingIntegrationDeadLetters: number;
  pendingReplays: number;
  openEscalations: number;
  openReconCases: number;
  latest: OpsIncidentView[];
  recentlyResolved: Array<
    OpsIncidentView & { rootCause: string | null; recoveryEvidence: string | null }
  >;
}
