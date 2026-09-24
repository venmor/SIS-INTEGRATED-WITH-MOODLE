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
  backend?: string;
  version?: string | null;
  status: string;
  lastCheckedAt: string | null;
}
