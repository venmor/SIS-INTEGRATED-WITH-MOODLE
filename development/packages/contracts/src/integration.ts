/** Phase 6 slice 1: integration views (TASK-PH6-001). Mappings bind
 * both SIS and Moodle identifiers with versions; activation is
 * four-eyes with synthetic validation first. */
export interface MappingView {
  id: string;
  kind: string;
  sisType: string;
  sisId: string;
  moodleId: string;
  version: number;
  status: string;
}
export interface ConnectionView {
  provider: string;
  backend?: 'simulator' | 'live-test' | 'live-test-disabled';
  version?: string | null;
  status: string;
  lastCheckedAt: string | null;
  detail?: string;
  reasons?: string[];
  writeReadiness?: MoodleWriteReadiness;
}

/** A source-flow deferral, never a fabricated delivery-attempt state. */
export interface NotProvisionedResult {
  outcome: 'NOT_PROVISIONED';
  backend: 'live-test' | 'live-test-disabled';
  reason: 'LIVE_PREREQUISITES_UNAVAILABLE' | 'LIVE_CONFIGURATION_REFUSED';
  detail: string;
}

export type MoodleWriteReadiness = NotProvisionedResult | {
  outcome: 'SIMULATOR_READY';
  backend: 'simulator';
  detail: string;
};

export interface MoodleWorkerRunResult {
  processed: number;
  delivered: number;
  retried: number;
  dead: number;
  deferred: number;
  deferral: NotProvisionedResult | null;
}

export interface DeferredMoodleSourceView {
  outboxId: string;
  eventType: string;
  occurredAt: string;
  outcome: 'NOT_PROVISIONED';
  reason: NotProvisionedResult['reason'];
  detail: string;
}

export interface MoodleDeliveryAttemptView {
  id: string;
  outboxId: string;
  eventType: string;
  state: string;
  attempt: number;
  nextRunAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface MoodleDeliveryQueueView {
  items: MoodleDeliveryAttemptView[];
  deferredSources: DeferredMoodleSourceView[];
  /** Oldest 100 source events only; this is a preview, not full traversal. */
  deferredSourcesTruncated: boolean;
  writeReadiness: MoodleWriteReadiness;
}
