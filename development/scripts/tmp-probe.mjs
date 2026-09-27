import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const O = 'SWE-2026S1';
const P = '2026S1';
const plans = await db.assessmentPlan.groupBy({
  by: ['status'],
  where: { offeringRef: O, periodCode: P },
  _count: true,
});
console.log('plans:', JSON.stringify(plans));
const cases = await db.moderationCase.findMany({
  select: {
    status: true,
    batch: {
      select: {
        mapping: {
          select: { component: { select: { code: true, plan: { select: { status: true } } } } },
        },
      },
    },
  },
});
const approvedGoverned = cases.filter(
  (c) => c.status === 'APPROVED' && c.batch.mapping.component.plan.status === 'APPROVED',
).length;
console.log(`cases total=${cases.length} approvedGoverned=${approvedGoverned}`);
const list = await db.assessmentCandidateList.findFirst({
  where: { offeringRef: O, periodCode: P, status: 'ACTIVE' },
  orderBy: { version: 'desc' },
});
console.log('activeList refs:', JSON.stringify(list?.studentRefs));
const openMissing = await db.gradeFinding.count({
  where: { status: 'OPEN', code: 'MISSING_MARK', batch: { offeringRef: O, periodCode: P } },
});
console.log('openMissing:', openMissing);
const ca = await db.officialCARecord.findMany({
  where: { offeringRef: O, periodCode: P, status: 'APPROVED' },
  select: { componentCode: true, studentRef: true, version: true },
});
const latest = new Map();
for (const r of [...ca].sort((a, b) => b.version - a.version)) {
  const slot = `${r.componentCode}::${r.studentRef}`;
  if (!latest.has(slot)) latest.set(slot, r);
}
console.log('latestSlots:', latest.size, 'refs:', JSON.stringify([...new Set([...latest.values()].map((r) => r.studentRef))]));
await db.$disconnect();
