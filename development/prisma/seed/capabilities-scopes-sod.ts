import { PrismaClient } from '@prisma/client';

/**
 * Seed capabilities, scopes, approver authority, and SoD pairs from config.
 * This implements GAP-003, GAP-004, GAP-006, GAP-012.
 */
export async function seedCapabilitiesScopesSod(prismaClient: PrismaClient) {
  console.log('Seeding capabilities, scopes, approver authority, and SoD pairs...');

  // ============================================
  // CAPABILITIES (GAP-003)
  // ============================================
  const capabilities = [
    { name: 'teach', description: 'Teach courses and manage teaching activities', category: 'TEACHING' },
    { name: 'stage-marks', description: 'Stage and publish student marks', category: 'TEACHING' },
    { name: 'manage-curriculum', description: 'Manage curriculum and course definitions', category: 'ADMIN' },
    { name: 'manage-admissions', description: 'Manage admissions applications and decisions', category: 'ADMISSIONS' },
    { name: 'manage-finance', description: 'Manage finance, fees, and payments', category: 'FINANCE' },
    { name: 'manage-students', description: 'Manage student records and enrolment', category: 'ADMIN' },
    { name: 'manage-staff', description: 'Manage staff assignments and roles', category: 'ADMIN' },
    { name: 'view-reports', description: 'View institutional reports and analytics', category: 'ADMIN' },
    { name: 'system-admin', description: 'Full system administration access', category: 'ADMIN' },
    { name: 'audit-access', description: 'Access audit logs and compliance reports', category: 'ADMIN' },
  ];

  for (const cap of capabilities) {
    await prismaClient.capability.upsert({
      where: { name: cap.name },
      update: { description: cap.description, category: cap.category, isActive: true },
      create: cap,
    });
  }
  console.log(`  Seeded ${capabilities.length} capabilities`);

  // ============================================
  // SCOPES (GAP-004) - Institutional hierarchy
  // ============================================
  // First, create the root SYSTEM:GLOBAL scope
  const globalScope = await prismaClient.scope.upsert({
    where: { name: 'SYSTEM:GLOBAL' },
    update: {},
    create: {
      name: 'SYSTEM:GLOBAL',
      description: 'Global system scope - applies to entire institution',
      effectiveFrom: new Date('2026-01-01'),
    },
  });

  // School-level scopes
  const schools = [
    { name: 'SCHOOL:ENGINEERING', description: 'School of Engineering' },
    { name: 'SCHOOL:MEDICINE', description: 'School of Medicine' },
    { name: 'SCHOOL:EDUCATION', description: 'School of Education' },
    { name: 'SCHOOL:LAW', description: 'School of Law' },
    { name: 'SCHOOL:NATURAL_SCIENCES', description: 'School of Natural Sciences' },
    { name: 'SCHOOL:HUMANITIES', description: 'School of Humanities and Social Sciences' },
    { name: 'SCHOOL:BUSINESS', description: 'School of Business' },
    { name: 'SCHOOL:AGRICULTURE', description: 'School of Agricultural Sciences' },
  ];

  const schoolScopes: Record<string, any> = {};
  for (const school of schools) {
    const scope = await prismaClient.scope.upsert({
      where: { name: school.name },
      update: {},
      create: {
        ...school,
        parentScopeId: globalScope.id,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
    schoolScopes[school.name] = scope;
  }
  console.log(`  Seeded ${schools.length} school scopes`);

  // Department-level scopes (sample for Engineering)
  const departments = [
    { name: 'DEPARTMENT:CS', description: 'Department of Computer Science', parent: 'SCHOOL:ENGINEERING' },
    { name: 'DEPARTMENT:EE', description: 'Department of Electrical Engineering', parent: 'SCHOOL:ENGINEERING' },
    { name: 'DEPARTMENT:ME', description: 'Department of Mechanical Engineering', parent: 'SCHOOL:ENGINEERING' },
    { name: 'DEPARTMENT:CE', description: 'Department of Civil Engineering', parent: 'SCHOOL:ENGINEERING' },
  ];

  for (const dept of departments) {
    await prismaClient.scope.upsert({
      where: { name: dept.name },
      update: {},
      create: {
        name: dept.name,
        description: dept.description,
        parentScopeId: schoolScopes[dept.parent].id,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
  }
  console.log(`  Seeded ${departments.length} department scopes`);

  // Programme scopes (sample)
  const programmes = [
    { name: 'PROGRAMME:BSC_CS', description: 'BSc Computer Science', parent: 'DEPARTMENT:CS' },
    { name: 'PROGRAMME:BSC_DS', description: 'BSc Data Science', parent: 'DEPARTMENT:CS' },
    { name: 'PROGRAMME:BENG_EE', description: 'BEng Electrical Engineering', parent: 'DEPARTMENT:EE' },
  ];

  for (const prog of programmes) {
    await prismaClient.scope.upsert({
      where: { name: prog.name },
      update: {},
      create: {
        name: prog.name,
        description: prog.description,
        parentScopeId: schoolScopes[prog.parent]?.id || (await prismaClient.scope.findUnique({ where: { name: prog.parent } }))?.id,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
  }
  console.log(`  Seeded ${programmes.length} programme scopes`);

  // Offering scopes (sample)
  const offerings = [
    { name: 'OFFERING:BSC_CS_2026_1', description: 'BSc CS 2026 Intake 1', parent: 'PROGRAMME:BSC_CS' },
    { name: 'OFFERING:BSC_DS_2026_1', description: 'BSc DS 2026 Intake 1', parent: 'PROGRAMME:BSC_DS' },
  ];

  for (const off of offerings) {
    await prismaClient.scope.upsert({
      where: { name: off.name },
      update: {},
      create: {
        name: off.name,
        description: off.description,
        parentScopeId: (await prismaClient.scope.findUnique({ where: { name: off.parent } }))?.id,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
  }
  console.log(`  Seeded ${offerings.length} offering scopes`);

  // ============================================
  // CAPABILITY <-> SCOPE LINKS (which capabilities apply to which scopes)
  // ============================================
  const allScopes = await prismaClient.scope.findMany();
  const allCapabilities = await prismaClient.capability.findMany();

  // Link all capabilities to SYSTEM:GLOBAL
  const global = allScopes.find(s => s.name === 'SYSTEM:GLOBAL');
  if (global) {
    for (const cap of allCapabilities) {
      await prismaClient.capabilityScope.upsert({
        where: { capabilityId_scopeId: { capabilityId: cap.id, scopeId: global.id } },
        update: {},
        create: { capabilityId: cap.id, scopeId: global.id },
      });
    }
  }

  // Link teaching capabilities to school/department scopes
  const teachingCaps = allCapabilities.filter(c => c.category === 'TEACHING');
  for (const scope of allScopes) {
    if (scope.name.startsWith('SCHOOL:') || scope.name.startsWith('DEPARTMENT:')) {
      for (const cap of teachingCaps) {
        await prismaClient.capabilityScope.upsert({
          where: { capabilityId_scopeId: { capabilityId: cap.id, scopeId: scope.id } },
          update: {},
          create: { capabilityId: cap.id, scopeId: scope.id },
        });
      }
    }
  }
  console.log('  Seeded capability-scope links');

  // ============================================
  // APPROVER AUTHORITY (GAP-006)
  // ============================================
  // Map roles to scopes they have authority over
  const approverAuthorities = [
    // SYSADMIN has authority over everything
    { approverRoleId: 'SYSADMIN', targetScopeName: 'SYSTEM:GLOBAL', capabilityName: 'system-admin' },
    { approverRoleId: 'SYSADMIN', targetScopeName: 'SYSTEM:GLOBAL', capabilityName: 'manage-staff' },
    { approverRoleId: 'SYSADMIN', targetScopeName: 'SYSTEM:GLOBAL', capabilityName: 'manage-students' },
    { approverRoleId: 'SYSADMIN', targetScopeName: 'SYSTEM:GLOBAL', capabilityName: 'audit-access' },

    // DEAN has authority over their school
    { approverRoleId: 'DEAN', targetScopeName: 'SCHOOL:ENGINEERING', capabilityName: 'teach' },
    { approverRoleId: 'DEAN', targetScopeName: 'SCHOOL:ENGINEERING', capabilityName: 'stage-marks' },
    { approverRoleId: 'DEAN', targetScopeName: 'SCHOOL:ENGINEERING', capabilityName: 'manage-curriculum' },
    { approverRoleId: 'DEAN', targetScopeName: 'SCHOOL:ENGINEERING', capabilityName: 'manage-staff' },
    { approverRoleId: 'DEAN', targetScopeName: 'SCHOOL:ENGINEERING', capabilityName: 'manage-students' },

    // HOD has authority over their department
    { approverRoleId: 'HOD', targetScopeName: 'DEPARTMENT:CS', capabilityName: 'teach' },
    { approverRoleId: 'HOD', targetScopeName: 'DEPARTMENT:CS', capabilityName: 'stage-marks' },
    { approverRoleId: 'HOD', targetScopeName: 'DEPARTMENT:CS', capabilityName: 'manage-curriculum' },

    // LECTURER has authority over their programme/offering for teaching
    { approverRoleId: 'LEC', targetScopeName: 'PROGRAMME:BSC_CS', capabilityName: 'teach' },
    { approverRoleId: 'LEC', targetScopeName: 'PROGRAMME:BSC_CS', capabilityName: 'stage-marks' },

    // ADMISSIONS_APPROVER has authority over admissions scopes
    { approverRoleId: 'ADMISSIONS_APPROVER', targetScopeName: 'SYSTEM:GLOBAL', capabilityName: 'manage-admissions' },

    // FINOFFICER has authority over finance
    { approverRoleId: 'FINOFFICER', targetScopeName: 'SYSTEM:GLOBAL', capabilityName: 'manage-finance' },
  ];

  for (const auth of approverAuthorities) {
    const scope = await prismaClient.scope.findUnique({ where: { name: auth.targetScopeName } });
    const capability = await prismaClient.capability.findUnique({ where: { name: auth.capabilityName } });
    if (scope && capability) {
      await prismaClient.approverAuthority.upsert({
        where: {
          approverRoleId_targetScopeId_capabilityId: {
            approverRoleId: auth.approverRoleId,
            targetScopeId: scope.id,
            capabilityId: capability.id,
          },
        },
        update: { isActive: true },
        create: {
          approverRoleId: auth.approverRoleId,
          targetScopeId: scope.id,
          capabilityId: capability.id,
          isActive: true,
        },
      });
    }
  }
  console.log(`  Seeded ${approverAuthorities.length} approver authorities`);

  // ============================================
  // SOD PAIRS (GAP-012)
  // ============================================
  const sodPairs = [
    // Dean cannot also be Finance Officer (financial oversight conflict)
    { roleAId: 'DEAN', roleBId: 'FINOFFICER', reason: 'Financial oversight conflict: Dean authorizes expenditure, Finance Officer controls funds' },
    // HOD cannot also be Finance Officer
    { roleAId: 'HOD', roleBId: 'FINOFFICER', reason: 'Financial oversight conflict: HOD authorizes departmental expenditure, Finance Officer controls funds' },
    // Admissions Officer cannot also be Admissions Approver (maker/checker)
    { roleAId: 'ADMISSIONS_OFFICER', roleBId: 'ADMISSIONS_APPROVER', reason: 'Maker/checker separation: Officer processes, Approver decides' },
    // Lecturer cannot also be Exam Board Chair for same programme
    { roleAId: 'LEC', roleBId: 'EXAM_BOARD_CHAIR', reason: 'Academic integrity: Lecturer teaches, Exam Board Chair oversees assessment' },
    // Sysadmin cannot also be Auditor
    { roleAId: 'SYSADMIN', roleBId: 'AUDITOR', reason: 'Segregation of duties: Sysadmin implements, Auditor reviews' },
  ];

  for (const pair of sodPairs) {
    // Ensure alphabetical ordering for unique constraint
    const [roleAId, roleBId] = [pair.roleAId, pair.roleBId].sort();
    await prismaClient.soDPair.upsert({
      where: { roleAId_roleBId: { roleAId, roleBId } },
      update: { reason: pair.reason, isActive: true },
      create: { roleAId, roleBId, reason: pair.reason, isActive: true },
    });
  }
  console.log(`  Seeded ${sodPairs.length} SoD pairs`);

  console.log('Seeding complete!');
}

// Run if executed directly (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  seedCapabilitiesScopesSod(prisma)
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}