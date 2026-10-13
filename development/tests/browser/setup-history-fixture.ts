import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { isDemonstrationDatabaseTarget } from "../../packages/config/src/demo-environment";
const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");

/** Draft-only pagination fixture. No approval, projection, command receipt or audit
 * success is fabricated. The real save/retry/activation story remains API-driven. */
export async function prepareSetupHistory() {
  const url = process.env.DATABASE_URL;
  if (
    !url ||
    !/(test|review|ci|browser)/i.test(new URL(url).pathname) ||
    !isDemonstrationDatabaseTarget(process.env)
  )
    throw new Error(
      "Setup history fixture requires an isolated demonstration test database.",
    );
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    await db.$transaction(async (tx: typeof db) => {
      const source = await tx.demoInstitutionSetupVersion.findFirstOrThrow({
        orderBy: { version: "desc" },
      });
      for (let index = 1; index <= 21; index++) {
        const version = source.version + index;
        const reason = `Fictional browser pagination fixture ${index}`;
        const contentDigest = createHash("sha256")
          .update(
            JSON.stringify({
              profile: source.profile,
              reason,
              baseActivationId: source.baseActivationId,
              expectedVersion: version - 1,
              policy: source.policyVersion,
            }),
          )
          .digest("hex");
        await tx.demoInstitutionSetupVersion.create({
          data: {
            version,
            profile: source.profile,
            reason,
            contentDigest,
            baseActivationId: source.baseActivationId,
            createdByAccountId: source.createdByAccountId,
            createdByAssignmentId: source.createdByAssignmentId,
            clientRequestId: randomUUID(),
            policyVersion: source.policyVersion,
          },
        });
      }
    });
  } finally {
    await db.$disconnect();
  }
}
