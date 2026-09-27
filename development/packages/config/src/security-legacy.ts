/**
 * Legacy security config migration helper (Task 1.3 / GAP-003, GAP-004, GAP-006, GAP-012).
 * 
 * This module provides utilities to migrate the deprecated SECURITY-v1 config
 * (policyVerbs, sodPairs) to the new database-backed registry:
 * - Capability
 * - Scope
 * - CapabilityScope
 * - ApproverAuthority
 * - SoDPair
 * 
 * Use for one-time migration or development database reset.
 * NOT for production use — institutional policy values must be approved and
 * entered directly in the database.
 */

import { PrismaClient } from '@prisma/client';
import { SECURITY_V1 } from './security.js';

/**
 * Migrate security config to database.
 * Reads SECURITY_V1.policyVerbs and SECURITY_V1.sodPairs and creates/updates:
 * - Capability entries (derived from policyVerbs)
 * - ApproverAuthority entries (derived from policyVerbs role mappings)
 * - SoDPair entries (from sodPairs)
 * 
 * This is a best-effort migration for demo/development purposes.
 * Institutional policy values require human approval and direct DB entry.
 */
export async function migrateSecurityConfigToDb(prisma: PrismaClient): Promise<void> {
  console.log('Migrating security config to database...');

  // 1. Create capabilities from policyVerbs
  // Extract unique capabilities from the verb definitions
  const verbCapabilities = new Set<string>();
  for (const [action, roles] of Object.entries(SECURITY_V1.policyVerbs)) {
    // Map action to capability name (simplified heuristic)
    if (action.includes('grant')) verbCapabilities.add('system-admin');
    if (action.includes('resolve')) verbCapabilities.add('system-admin');
    if (action.includes('workspace')) verbCapabilities.add('manage-staff');
    if (action.includes('me.read')) verbCapabilities.add('view-reports');
  }
  // Add known capabilities
  const knownCapabilities = [
    'teach', 'stage-marks', 'manage-curriculum', 'manage-admissions',
    'manage-finance', 'manage-students', 'manage-staff', 'view-reports',
    'system-admin', 'audit-access',
  ];
  for (const cap of knownCapabilities) verbCapabilities.add(cap);

  for (const capName of verbCapabilities) {
    await prisma.capability.upsert({
      where: { name: capName },
      update: { isActive: true },
      create: {
        name: capName,
        description: `Migrated from SECURITY-v1: ${capName}`,
        category: capName.includes('teach') || capName.includes('stage') ? 'TEACHING' :
                  capName.includes('finance') ? 'FINANCE' :
                  capName.includes('admission') ? 'ADMISSIONS' : 'ADMIN',
        isActive: true,
      },
    });
  }
  console.log(`  Migrated ${verbCapabilities.size} capabilities`);

  // 2. Create approver authorities from policyVerbs
  // For each verb → roles mapping, create authority for that role over SYSTEM:GLOBAL
  // with the relevant capability
  const systemGlobalScope = await prisma.scope.findUnique({
    where: { name: 'SYSTEM:GLOBAL' },
  });

  if (systemGlobalScope) {
    for (const [action, roles] of Object.entries(SECURITY_V1.policyVerbs)) {
      let capabilityName = 'system-admin';
      if (action.includes('workspace')) capabilityName = 'manage-staff';
      if (action.includes('me.read')) capabilityName = 'view-reports';

      const capability = await prisma.capability.findUnique({
        where: { name: capabilityName },
      });

      if (capability) {
        for (const role of roles) {
          await prisma.approverAuthority.upsert({
            where: {
              approverRoleId_targetScopeId_capabilityId: {
                approverRoleId: role,
                targetScopeId: systemGlobalScope.id,
                capabilityId: capability.id,
              },
            },
            update: { isActive: true },
            create: {
              approverRoleId: role,
              targetScopeId: systemGlobalScope.id,
              capabilityId: capability.id,
              isActive: true,
            },
          });
        }
      }
    }
    console.log('  Migrated approver authorities from policyVerbs');
  }

  // 3. Create SoD pairs from sodPairs config
  for (const [roleA, roleB] of SECURITY_V1.sodPairs) {
    const [sortedA, sortedB] = [roleA, roleB].sort();
    await prisma.sodPair.upsert({
      where: { roleAId_roleBId: { roleAId: sortedA, roleBId: sortedB } },
      update: { isActive: true },
      create: {
        roleAId: sortedA,
        roleBId: sortedB,
        reason: `Migrated from SECURITY-v1 sodPairs: ${roleA} + ${roleB}`,
        isActive: true,
      },
    });
  }
  console.log(`  Migrated ${SECURITY_V1.sodPairs.length} SoD pairs`);

  console.log('Security config migration complete!');
}

/**
 * Clear all migrated data (for development reset).
 * Use with caution — only for development environments.
 */
export async function clearMigratedSecurityData(prisma: PrismaClient): Promise<void> {
  await prisma.soDPair.deleteMany();
  await prisma.approverAuthority.deleteMany();
  await prisma.capabilityScope.deleteMany();
  await prisma.scope.deleteMany();
  await prisma.capability.deleteMany();
  console.log('Cleared migrated security data');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  
  try {
    await migrateSecurityConfigToDb(prisma);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}