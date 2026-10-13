/** Application policy provider.
 * Selects and caches the appropriate policy (demo or production) based on DEMO_MODE.
 * Initializes on first access to avoid import-order issues. */
import { APPLICATION_DEMO_V1 } from '@sis/config';
import type { ApplicationPolicy } from '@sis/contracts';

let cachedPolicy: ApplicationPolicy | null = null;
let initPromise: Promise<ApplicationPolicy> | null = null;

/** Get the application policy (async, handles dynamic import for production). */
export async function getPolicy(): Promise<ApplicationPolicy> {
  if (cachedPolicy) return cachedPolicy;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (process.env.DEMO_MODE === "true") {
      cachedPolicy = APPLICATION_DEMO_V1 as ApplicationPolicy;
    } else throw new Error('Production admissions policy is awaiting institutional approval');
    return cachedPolicy!;
  })();

  return initPromise;
}

/** Get the application policy synchronously.
 * Uses require for production config to avoid async in sync contexts.
 * Must be called after environment is set. */
export function getPolicySync(): ApplicationPolicy {
  if (cachedPolicy) return cachedPolicy;

  if (process.env.DEMO_MODE === "true") {
    cachedPolicy = APPLICATION_DEMO_V1 as ApplicationPolicy;
  } else throw new Error('Production admissions policy is awaiting institutional approval');
  return cachedPolicy;
}

/** Reset the cached policy (for testing only). */
export function resetPolicyCache(): void {
  cachedPolicy = null;
  initPromise = null;
}

/** Policy object with property accessors that delegate to getPolicySync().
 * Allows existing code using `policy.version` etc. to work with minimal changes. */
const policyProxy = new Proxy(
  {} as ApplicationPolicy,
  {
    get(_target, prop: string) {
      const p = getPolicySync();
      return p[prop as keyof ApplicationPolicy];
    },
  },
);

export const policy = policyProxy;
