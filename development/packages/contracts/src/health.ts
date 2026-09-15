/**
 * Canonical health-check contract (Phase 0 shell).
 * Backend MUST return this shape from GET /health; frontend MUST NOT
 * invent its own copy — import this type once workspace type-linking
 * lands in the first API slice (see NOTE-PH0-003).
 */
export interface HealthResponse {
  status: 'ok';
  version: string;
}
