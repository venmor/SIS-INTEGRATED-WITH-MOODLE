// Add only the two setup actors; never reset existing applicant/student journeys.
import { createRequire } from "node:module";
import { seedDemoUniversityAccounts } from "../prisma/seed/demo-university.mjs";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  if (!(await seedDemoUniversityAccounts(db)))
    throw new Error("Enable both explicit fictional setup switches first.");
  console.log(
    "Fictional proposer and independent reviewer appointments ready. No setup version was auto-approved.",
  );
} finally {
  await db.$disconnect();
}
