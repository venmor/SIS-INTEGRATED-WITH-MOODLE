import { createRequire } from "node:module";
const { hash, verify } = createRequire(import.meta.url)("argon2");

/** Local fictional appointments only; existing users and credentials stay intact. */
export async function seedDemoUniversityAccounts(db) {
  if (
    process.env.DEMO_MODE !== "true" ||
    process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP !== "true"
  )
    return false;
  const url = new URL(
    process.env.DATABASE_URL ?? "postgresql://invalid/invalid",
  );
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/(?:^|_)(?:test|review|ci)(?:_|$)/i.test(url.pathname.slice(1))
  )
    throw new Error(
      "Fictional setup appointments need a loopback isolated review/test database.",
    );
  const personIds = new Set();
  for (const [username, name, password, capability] of [
    [
      "nalumino.setup",
      "Nalumino Setup (fictional)",
      "Seed-2026-Setup",
      "institution-demo-setup-propose",
    ],
    [
      "chileshe.policy",
      "Chileshe Policy Reviewer (fictional)",
      "Seed-2026-Policy",
      "institution-demo-setup-approve",
    ],
  ]) {
    const existing = await db.account.findUnique({
      where: { username },
      include: { roles: true, person: true, credentials: true },
    });
    if (existing) {
      const now = new Date();
      if (
        existing.status !== "ACTIVE" ||
        existing.person?.status !== "ACTIVE" ||
        (existing.lockedUntil && existing.lockedUntil > now) ||
        !existing.roles.some(
          (role) =>
            role.role === "DOMAIN_ADMIN" &&
            role.scopeType === "SYSTEM" &&
            role.scopeRef === "DEMO-UNIVERSITY" &&
            role.capabilities.includes(capability) &&
            !role.revokedAt &&
            role.startsAt <= now &&
            (!role.endsAt || role.endsAt > now),
        )
      )
        throw new Error(
          "Existing setup account does not match an active fictional appointment; review it without automatic privilege changes.",
        );
      if (personIds.has(existing.personId))
        throw new Error(
          "Fictional setup appointments need independent people; review the existing identities.",
        );
      personIds.add(existing.personId);
      const credentials = existing.credentials.filter(
        (credential) =>
          credential.kind === "PASSWORD" &&
          credential.status === "ACTIVE" &&
          !credential.supersededAt,
      );
      let matches = false;
      try {
        matches =
          credentials.length === 1 &&
          (await verify(credentials[0].secretHash, password));
      } catch {
        /* fail closed */
      }
      if (!matches)
        throw new Error(
          "Existing fictional setup credential differs; review it without replacing the credential.",
        );
      continue;
    }
    const created = await db.account.create({
      data: {
        username,
        person: {
          create: { displayName: name, email: `${username}@demo.invalid` },
        },
        credentials: {
          create: { kind: "PASSWORD", secretHash: await hash(password) },
        },
        roles: {
          create: {
            role: "DOMAIN_ADMIN",
            scopeType: "SYSTEM",
            scopeRef: "DEMO-UNIVERSITY",
            capabilities: [capability],
            startsAt: new Date("2026-01-01T00:00:00Z"),
            endsAt: new Date("2027-01-01T00:00:00Z"),
            appointmentRef: "DEMO-SETUP-2026.1",
            authoritySource: "User-authorized fictional university rehearsal",
            reason: "Fictional structure and calendar workflow only",
          },
        },
      },
    });
    personIds.add(created.personId);
  }
  return true;
}
