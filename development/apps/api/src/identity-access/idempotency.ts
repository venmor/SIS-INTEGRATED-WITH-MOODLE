// Idempotency receipt guards (slice 4/5 claim/replay). Stored receipts are
// JSON: a corrupted or foreign-shaped row must never drive a replay (which
// would return undefined ids and log a bogus ALLOW). Malformed rows fall
// through to the in-flight/stale handling of the caller.
export function validReceipt<T extends Record<string, string>>(
  value: unknown,
  keys: (keyof T & string)[],
): value is T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return keys.every((key) => typeof row[key] === 'string');
}
