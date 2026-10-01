import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Use a test database URL
const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sis:sis_local_only@localhost:5432/sis';

const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

describe('Scope Hierarchy (GAP-004)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have SYSTEM:GLOBAL as root scope', async () => {
    const global = await prisma.scope.findUnique({
      where: { name: 'SYSTEM:GLOBAL' },
    });
    expect(global).not.toBeNull();
    expect(global?.parentScopeId).toBeNull();
  });

  it('should have school scopes as children of SYSTEM:GLOBAL', async () => {
    const schools = await prisma.scope.findMany({
      where: { name: { startsWith: 'SCHOOL:' } },
    });
    expect(schools.length).toBeGreaterThan(0);
    for (const school of schools) {
      expect(school.parentScopeId).not.toBeNull();
      const parent = await prisma.scope.findUnique({ where: { id: school.parentScopeId! } });
      expect(parent?.name).toBe('SYSTEM:GLOBAL');
    }
  });

  it('should have department scopes as children of school scopes', async () => {
    const departments = await prisma.scope.findMany({
      where: { name: { startsWith: 'DEPARTMENT:' } },
    });
    expect(departments.length).toBeGreaterThan(0);
    for (const dept of departments) {
      expect(dept.parentScopeId).not.toBeNull();
      const parent = await prisma.scope.findUnique({ where: { id: dept.parentScopeId! } });
      expect(parent?.name).toMatch(/^SCHOOL:/);
    }
  });

  it('should have programme scopes as children of department scopes', async () => {
    const programmes = await prisma.scope.findMany({
      where: { name: { startsWith: 'PROGRAMME:' } },
    });
    expect(programmes.length).toBeGreaterThan(0);
    for (const prog of programmes) {
      expect(prog.parentScopeId).not.toBeNull();
      const parent = await prisma.scope.findUnique({ where: { id: prog.parentScopeId! } });
      expect(parent?.name).toMatch(/^DEPARTMENT:/);
    }
  });

  it('should have offering scopes as children of programme scopes', async () => {
    const offerings = await prisma.scope.findMany({
      where: { name: { startsWith: 'OFFERING:' } },
    });
    expect(offerings.length).toBeGreaterThan(0);
    for (const off of offerings) {
      expect(off.parentScopeId).not.toBeNull();
      const parent = await prisma.scope.findUnique({ where: { id: off.parentScopeId! } });
      expect(parent?.name).toMatch(/^PROGRAMME:/);
    }
  });

  it('should have effective dates on all scopes', async () => {
    const scopes = await prisma.scope.findMany();
    for (const scope of scopes) {
      expect(scope.effectiveFrom).not.toBeNull();
      expect(scope.effectiveFrom).toBeInstanceOf(Date);
    }
  });
});

describe('Capability Registry (GAP-003)', () => {
  it('should have seeded capabilities', async () => {
    const capabilities = await prisma.capability.findMany({
      where: { isActive: true },
    });
    expect(capabilities.length).toBeGreaterThan(0);
    const names = capabilities.map(c => c.name);
    expect(names).toContain('teach');
    expect(names).toContain('stage-marks');
    expect(names).toContain('manage-admissions');
    expect(names).toContain('manage-finance');
    expect(names).toContain('system-admin');
  });

  it('should have categories on capabilities', async () => {
    const capabilities = await prisma.capability.findMany();
    for (const cap of capabilities) {
      expect(cap.category).toBeTruthy();
    }
  });
});

describe('Capability-Scope Links', () => {
  it('should link all capabilities to SYSTEM:GLOBAL', async () => {
    const global = await prisma.scope.findUnique({ where: { name: 'SYSTEM:GLOBAL' } });
    const links = await prisma.capabilityScope.findMany({
      where: { scopeId: global!.id },
    });
    const capabilities = await prisma.capability.findMany({ where: { isActive: true } });
    expect(links.length).toBe(capabilities.length);
  });

  it('should link teaching capabilities to school and department scopes', async () => {
    const teachingCaps = await prisma.capability.findMany({ where: { category: 'TEACHING' } });
    const schoolScopes = await prisma.scope.findMany({ where: { name: { startsWith: 'SCHOOL:' } } });
    const deptScopes = await prisma.scope.findMany({ where: { name: { startsWith: 'DEPARTMENT:' } } });

    for (const scope of [...schoolScopes, ...deptScopes]) {
      const links = await prisma.capabilityScope.findMany({ where: { scopeId: scope.id } });
      const linkedCapNames = new Set(
        (await prisma.capability.findMany({
          where: { id: { in: links.map(l => l.capabilityId) } },
        })).map(c => c.name)
      );
      for (const cap of teachingCaps) {
        expect(linkedCapNames.has(cap.name)).toBe(true);
      }
    }
  });
});