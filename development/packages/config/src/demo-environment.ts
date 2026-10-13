/** Server-side opt-in only. Pass environment explicitly; never expose pins or URLs to clients. */
type DemoEnvironment = Record<string, string | undefined>;
const loopback = (host: string) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(host);
const isolatedName = /(?:^|_)(?:test|review|ci)(?:_|$)/i;
function cloudDatabaseTarget(env: DemoEnvironment, url: URL): boolean {
  const pins = [
    env.SIS_DEMO_DATABASE_HOST,
    env.SIS_DEMO_DATABASE_DIRECT_HOST,
  ].filter((value): value is string => Boolean(value));
  return (
    env.SIS_ENABLE_CLOUD_DEMONSTRATION === "true" &&
    Boolean(env.SIS_DEMO_DATABASE_HOST) &&
    Boolean(env.SIS_DEMO_DATABASE_NAME) &&
    pins.every(
      (host) =>
        /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) &&
        host.includes(".") &&
        !loopback(host) &&
        !/^\d+\.\d+\.\d+\.\d+$/.test(host),
    ) &&
    pins.includes(url.hostname) &&
    (!url.port || url.port === "5432") &&
    decodeURIComponent(url.pathname.slice(1)) === env.SIS_DEMO_DATABASE_NAME &&
    !env.SIS_DEMO_DATABASE_NAME!.includes("/") &&
    url.searchParams.getAll("sslmode").length === 1 &&
    ["require", "verify-full"].includes(
      url.searchParams.get("sslmode") ?? "",
    ) &&
    [...url.searchParams.keys()].every((key) =>
      [
        "sslmode",
        "channel_binding",
        "connect_timeout",
        "application_name",
      ].includes(key),
    ) &&
    !url.hash
  );
}
export function isDemonstrationDatabaseTarget(
  env: DemoEnvironment,
  localNamePattern: RegExp = isolatedName,
): boolean {
  if (env.DEMO_MODE !== "true") return false;
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    if (!["postgresql:", "postgres:"].includes(url.protocol)) return false;
    if (loopback(url.hostname))
      return (
        !url.hash &&
        [...url.searchParams.keys()].every((key) =>
          ["sslmode", "channel_binding", "connect_timeout", "application_name",
            "schema", "connection_limit", "pool_timeout", "pgbouncer"].includes(key),
        ) &&
        localNamePattern.test(decodeURIComponent(url.pathname.slice(1)))
      );
    return cloudDatabaseTarget(env, url);
  } catch {
    return false;
  }
}
export function isDemonstrationApiTarget(
  env: DemoEnvironment,
  value: string,
): boolean {
  if (!isDemonstrationDatabaseTarget(env)) return false;
  try {
    const api = new URL(value);
    const db = new URL(env.DATABASE_URL ?? "");
    if (
      api.username ||
      api.password ||
      api.search ||
      api.hash ||
      api.pathname !== "/"
    )
      return false;
    if (loopback(db.hostname))
      return api.protocol === "http:" && loopback(api.hostname);
    return (
      api.protocol === "https:" &&
      api.origin === env.SIS_DEMO_API_ORIGIN &&
      !loopback(api.hostname) &&
      cloudDatabaseTarget(env, db)
    );
  } catch {
    return false;
  }
}
