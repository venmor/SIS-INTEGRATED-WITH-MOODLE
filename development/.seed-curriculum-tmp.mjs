import { PrismaPg } from '@prisma/adapter-pg';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const url = process.env.DATABASE_URL;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const programme = await db.programme.findUniqueOrThrow({ where: { code: 'SWE' } });
await db.curriculumVersion.upsert({
  where: { programmeId_version: { programmeId: programme.id, version: 1 } },
  update: { status: 'PUBLISHED' },
  create: { programmeId: programme.id, version: 1, status: 'PUBLISHED' },
});
console.log('CURRICULUM-SEED-OK');
await db.$disconnect();
