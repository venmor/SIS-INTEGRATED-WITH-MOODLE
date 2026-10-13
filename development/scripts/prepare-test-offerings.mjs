// Refresh only the fictional, seeded catalogue deadlines in an isolated test DB.
// The product seed keeps its historical dates so the API's deadline rule remains
// honest; a test run needs an open intake regardless of the calendar date.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadEnv } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ root, requireFile: false });

const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
const dbName = decodeURIComponent(url.pathname.slice(1));
if (
  process.env.DEMO_MODE !== 'true' ||
  !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
  !/(?:^|_)(?:test|review|ci|browser)(?:_|$)/i.test(dbName)
) {
  console.error('Isolated test database required (local host, test/review/ci/browser name, DEMO_MODE=true).');
  process.exit(2);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const deadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const result = await prisma.programmeOffering.updateMany({
    where: {
      intake: '2026S1',
      availability: 'OPEN',
      deadline: { lte: new Date() },
      programme: { code: { in: ['SWE', 'RAD'] } },
    },
    data: { deadline },
  });
  console.log(`Refreshed ${result.count} fictional offering deadline(s) in ${dbName}.`);
} finally {
  await prisma.$disconnect();
}
