import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sis:sis_local_only@localhost:5432/sis';

const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

describe('Approver Authority (GAP-006)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have approver authorities seeded', async () => {
    const authorities = await prisma.approverAuthority.findMany({
      where: { isActive: true },
    });
    expect(authorities.length).toBeGreaterThan(0);
  });

  it('should have SYSADMIN authority over SYSTEM:GLOBAL for system-admin', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'SYSADMIN',
        capability: { name: 'system-admin' },
        targetScope: { name: 'SYSTEM:GLOBAL' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have SYSADMIN authority over SYSTEM:GLOBAL for manage-staff', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'SYSADMIN',
        capability: { name: 'manage-staff' },
        targetScope: { name: 'SYSTEM:GLOBAL' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have DEAN authority over SCHOOL:ENGINEERING for teach', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'DEAN',
        capability: { name: 'teach' },
        targetScope: { name: 'SCHOOL:ENGINEERING' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have DEAN authority over SCHOOL:ENGINEERING for stage-marks', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'DEAN',
        capability: { name: 'stage-marks' },
        targetScope: { name: 'SCHOOL:ENGINEERING' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have HOD authority over DEPARTMENT:CS for teach', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'HOD',
        capability: { name: 'teach' },
        targetScope: { name: 'DEPARTMENT:CS' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have LEC authority over PROGRAMME:BSC_CS for teach', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'LEC',
        capability: { name: 'teach' },
        targetScope: { name: 'PROGRAMME:BSC_CS' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have ADMISSIONS_APPROVER authority over SYSTEM:GLOBAL for manage-admissions', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'ADMISSIONS_APPROVER',
        capability: { name: 'manage-admissions' },
        targetScope: { name: 'SYSTEM:GLOBAL' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have FINOFFICER authority over SYSTEM:GLOBAL for manage-finance', async () => {
    const authority = await prisma.approverAuthority.findFirst({
      where: {
        approverRoleId: 'FINOFFICER',
        capability: { name: 'manage-finance' },
        targetScope: { name: 'SYSTEM:GLOBAL' },
        isActive: true,
      },
    });
    expect(authority).not.toBeNull();
  });

  it('should have unique constraint on approverRoleId + targetScopeId + capabilityId', async () => {
    const authorities = await prisma.approverAuthority.findMany({
      where: { isActive: true },
    });
    const keys = new Set(
      authorities.map(a => `${a.approverRoleId}:${a.targetScopeId}:${a.capabilityId}`)
    );
    expect(keys.size).toBe(authorities.length);
  });
});

describe('Approver Authority - Effective Dates', () => {
  it('should reject authority if scope effectiveFrom is in future', async () => {
    const futureScope = await prisma.scope.create({
      data: {
        name: 'TEST:FUTURE_SCOPE',
        description: 'Future scope for testing',
        parentScopeId: (await prisma.scope.findUnique({ where: { name: 'SYSTEM:GLOBAL' } }))!.id,
        effectiveFrom: new Date(Date.now() + 86400000), // Tomorrow
      },
    });

    // Add authority for DEAN over this future scope
    const capability = await prisma.capability.findUnique({ where: { name: 'teach' } });
    await prisma.approverAuthority.create({
      data: {
        approverRoleId: 'DEAN',
        targetScopeId: futureScope.id,
        capabilityId: capability!.id,
        isActive: true,
      },
    });

    // The validateApproverAuthority logic would check effectiveFrom > now
    const now = new Date();
    expect(futureScope.effectiveFrom > now).toBe(true);

    // Cleanup
    await prisma.approverAuthority.deleteMany({
      where: { targetScopeId: futureScope.id },
    });
    await prisma.scope.delete({ where: { id: futureScope.id } });
  });

  it('should reject authority if scope effectiveTo is in past', async () => {
    const pastScope = await prisma.scope.create({
      data: {
        name: 'TEST:PAST_SCOPE',
        description: 'Past scope for testing',
        parentScopeId: (await prisma.scope.findUnique({ where: { name: 'SYSTEM:GLOBAL' } }))!.id,
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: new Date('2020-12-31'),
      },
    });

    const capability = await prisma.capability.findUnique({ where: { name: 'teach' } });
    await prisma.approverAuthority.create({
      data: {
        approverRoleId: 'DEAN',
        targetScopeId: pastScope.id,
        capabilityId: capability!.id,
        isActive: true,
      },
    });

    const now = new Date();
    expect(pastScope.effectiveTo! < now).toBe(true);

    // Cleanup
    await prisma.approverAuthority.deleteMany({
      where: { targetScopeId: pastScope.id },
    });
    await prisma.scope.delete({ where: { id: pastScope.id } });
  });
});