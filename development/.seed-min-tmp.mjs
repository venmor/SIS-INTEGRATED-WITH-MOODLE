import { PrismaPg } from '@prisma/adapter-pg';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const url = process.env.DATABASE_URL;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const programme = await db.programme.upsert({
  where: { code: 'SWE' },
  update: {},
  create: {
    code: 'SWE',
    name: 'Fictional Software Engineering',
    awardLevel: 'BSc',
    school: 'Computing',
    duration: '4 years',
    overview: 'Isolated test programme',
    feeScheduleRef: 'FIN-DEMO-v1',
    publishedVersion: '1',
    effectiveDate: new Date('2026-01-01'),
    owningOffice: 'Registry',
  },
});
await db.programmeOffering.upsert({
  where: {
    programmeId_intake_studyMode_campus: {
      programmeId: programme.id,
      intake: '2026S1',
      studyMode: 'FULLTIME',
      campus: 'MAIN',
    },
  },
  update: { availability: 'OPEN' },
  create: {
    programmeId: programme.id,
    intake: '2026S1',
    studyMode: 'FULLTIME',
    campus: 'MAIN',
    availability: 'OPEN',
  },
});
await db.academicPeriod.upsert({
  where: { code: '2026S1' },
  update: {},
  create: { code: '2026S1', status: 'ACTIVE' },
});
console.log('MIN-SEED-OK');
await db.$disconnect();
