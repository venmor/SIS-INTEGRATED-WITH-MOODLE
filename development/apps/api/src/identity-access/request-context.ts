import { AsyncLocalStorage } from 'node:async_hooks';

// Request-scoped incident propagation (slice 5, handbook §12.11: break-glass
// "records every action"). A Nest interceptor sets the active emergency
// incident for the request; auditAuth() merges it into row metadata. No
// thread-locals, no manual plumbing through forty call sites: AsyncLocalStorage
// follows the async chain from the interceptor through services. Daemon and
// guard paths run outside any request store and are unaffected.
export interface IncidentStore {
  incidentRef: string | null;
}

const storage = new AsyncLocalStorage<IncidentStore>();

export function runWithIncident<T>(incidentRef: string | null, fn: () => T): T {
  return storage.run({ incidentRef }, fn);
}

// Mutates the ambient store (set up by the incident middleware at the edge).
// No-op outside a request store (daemon, guards, tests without middleware).
export function setIncidentRef(incidentRef: string | null): void {
  const store = storage.getStore();
  if (store) store.incidentRef = incidentRef;
}

export function currentIncidentRef(): string | null {
  return storage.getStore()?.incidentRef ?? null;
}
