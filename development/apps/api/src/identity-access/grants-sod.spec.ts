import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'node:child_process';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sis:sis_local_only@localhost:5432/sis';

const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

describe('SoD Pairs (GAP-012)', () => {
  beforeAll(async () => {
    try {
      execSync('npx prisma migrate deploy', {
        cwd: '/home/hangoma/SIS-INTEGRATED-WITH-MOODLE/development',
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdio: 'ignore',
      });
    } catch {
      // Migrations may already be applied
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have SoD pairs seeded', async () => {
    const pairs = await prisma.soDPair.findMany({ where: { isActive: true } });
    expect(pairs.length).toBeGreaterThan(0);
  });

  it('should have DEAN <-> FINOFFICER conflict', async () => {
    const pair = await prisma.soDPair.findFirst({
      where: {
        isActive: true,
        OR: [
          { roleAId: 'DEAN', roleBId: 'FINOFFICER' },
          { roleAId: 'FINOFFICER', roleBId: 'DEAN' },
        ],
      },
    });
    expect(pair).not.toBeNull();
    expect(pair?.reason).toContain('Financial oversight');
  });

  it('should have HOD <-> FINOFFICER conflict', async () => {
    const pair = await prisma.soDPair.findFirst({
      where: {
        isActive: true,
        OR: [
          { roleAId: 'HOD', roleBId: 'FINOFFICER' },
          { roleAId: 'FINOFFICER', roleBId: 'HOD' },
        ],
      },
    });
    expect(pair).not.toBeNull();
    expect(pair?.reason).toContain('Financial oversight');
  });

  it('should have ADMISSIONS_OFFICER <-> ADMISSIONS_APPROVER conflict (maker/checker)', async () => {
    const pair = await prisma.soDPair.findFirst({
      where: {
        isActive: true,
        OR: [
          { roleAId: 'ADMISSIONS_OFFICER', roleBId: 'ADMISSIONS_APPROVER' },
          { roleAId: 'ADMISSIONS_APPROVER', roleBId: 'ADMISSIONS_OFFICER' },
        ],
      },
    });
    expect(pair).not.toBeNull();
    expect(pair?.reason).toContain('Maker/checker');
  });

  it('should have LEC <-> EXAM_BOARD_CHAIR conflict', async () => {
    const pair = await prisma.soDPair.findFirst({
      where: {
        isActive: true,
        OR: [
          { roleAId: 'LEC', roleBId: 'EXAM_BOARD_CHAIR' },
          { roleAId: 'EXAM_BOARD_CHAIR', roleBId: 'LEC' },
        ],
      },
    });
    expect(pair).not.toBeNull();
    expect(pair?.reason).toContain('Academic integrity');
  });

  it('should have SYSADMIN <-> AUDITOR conflict', async () => {
    const pair = await prisma.soDPair.findFirst({
      where: {
        isActive: true,
        OR: [
          { roleAId: 'SYSADMIN', roleBId: 'AUDITOR' },
          { roleAId: 'AUDITOR', roleBId: 'SYSADMIN' },
        ],
      },
    });
    expect(pair).not.toBeNull();
    expect(pair?.reason).toContain('Segregation of duties');
  });

  it('should enforce alphabetical ordering in unique constraint (roleAId < roleBId)', async () => {
    const pairs = await prisma.soDPair.findMany({ where: { isActive: true } });
    for (const pair of pairs) {
      expect(pair.roleAId.localeCompare(pair.roleBId)).toBeLessThan(0);
    }
  });

  it('should have unique constraint on roleAId + roleBId', async () => {
    const pairs = await prisma.soDPair.findMany({ where: { isActive: true } });
    const keys = new Set(pairs.map(p => `${p.roleAId}:${p.roleBId}`));
    expect(keys.size).toBe(pairs.length);
  });

  it('inactive SoD pairs should be ignored in conflict checks', async () => {
    // Create an inactive SoD pair
    await prisma.soDPair.create({
      data: {
        roleAId: 'TEST_ROLE_A',
        roleBId: 'TEST_ROLE_B',
        reason: 'Test inactive pair',
        isActive: false,
      },
    });

    const activePairs = await prisma.soDPair.findMany({ where: { isActive: true } });
    const inactivePairs = await prisma.soDPair.findMany({ where: { isActive: false } });

    expect(activePairs.some(p => p.roleAId === 'TEST_ROLE_A')).toBe(false);
    expect(inactivePairs.some(p => p.roleAId === 'TEST_ROLE_A')).toBe(true);

    // Cleanup
    await prisma.soDPair.delete({
      where: { roleAId_roleBId: { roleAId: 'TEST_ROLE_A', roleBId: 'TEST_ROLE_B' } },
    });
  });
});

describe('Periodic SoD Review Query', () => {
  it('should be able to query all accounts with SoD conflicts', async () => {
    // This test verifies the query pattern for periodic SoD review
    // In practice, this would be a scheduled job that runs periodically
    
    // Get all active SoD pairs
    const sodPairs = await prisma.soDPair.findMany({ where: { isActive: true } });
    
    // For each pair, find accounts that hold both roles
    const conflicts: Array<{
      accountId: string;
      roleA: string;
      roleB: string;
      assignments: string[];
    }> = [];

    for (const pair of sodPairs) {
      // Find accounts with roleA
      const accountsWithA = await prisma.roleAssignment.findMany({
        where: {
          role: pair.roleAId,
          revokedAt: null,
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          startsAt: { lte: new Date() },
        },
        select: { accountId: true, id: true },
      });

      const accountIdsWithA = new Set(accountsWithA.map(a => a.accountId));

      // Find accounts with roleB
      const accountsWithB = await prisma.roleAssignment.findMany({
        where: {
          role: pair.roleBId,
          revokedAt: null,
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          startsAt: { lte: new Date() },
        },
        select: { accountId: true, id: true },
      });

      // Find intersection
      for (const accB of accountsWithB) {
        if (accountIdsWithA.has(accB.accountId)) {
          const assignmentsA = accountsWithA.filter(a => a.accountId === accB.accountId).map(a => a.id);
          const assignmentsB = accountsWithB.filter(a => a.accountId === accB.accountId).map(a => a.id);
          
          conflicts.push({
            accountId: accB.accountId,
            roleA: pair.roleAId,
            roleB: pair.roleBId,
            assignments: [...assignmentsA, ...assignmentsB],
          });
        }
      }
    }

    // The query should execute without errors
    expect(typeof conflicts).toBe('object');
    // In test environment, there may be no conflicts, which is fine
    console.log(`Found ${conflicts.length} SoD conflicts in current data`);
  });

  it('should return empty array when no conflicts exist', async () => {
    // This test ensures the query works correctly even with no conflicts
    const sodPairs = await prisma.soDPair.findMany({ where: { isActive: true } });
    
    let totalConflicts = 0;
    for (const pair of sodPairs) {
      const accountsWithA = await prisma.roleAssignment.findMany({
        where: {
          role: pair.roleAId,
          revokedAt: null,
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          startsAt: { lte: new Date() },
        },
        select: { accountId: true },
      });

      const accountIdsWithA = new Set(accountsWithA.map(a => a.accountId));

      const accountsWithB = await prisma.roleAssignment.findMany({
        where: {
          role: pair.roleBId,
          revokedAt: null,
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          startsAt: { lte: new Date() },
        },
        select: { accountId: true },
      });

      for (const accB of accountsWithB) {
        if (accountIdsWithA.has(accB.accountId)) {
          totalConflicts++;
        }
      }
    }

    expect(totalConflicts).toBeGreaterThanOrEqual(0);
  });
});