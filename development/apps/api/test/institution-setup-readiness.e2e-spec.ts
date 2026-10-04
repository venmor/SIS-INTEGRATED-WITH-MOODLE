import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

describe('V2 institution setup operational readiness', () => {
  let app: INestApplication;
  let db: PrismaService;

  async function actor(role: string, scopeType: string, scopeRef: string) {
    const person = await db.person.create({
      data: {
        displayName: 'Fictional setup operator',
        email: `${randomUUID()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: randomUUID() },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role,
        scopeType,
        scopeRef,
        capabilities: ['manage-roles'],
        reason: 'synthetic setup-readiness test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: assignment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return { cookie: `sid=${token}`, assignmentId: assignment.id };
  }

  beforeAll(async () => {
    const database = process.env.DATABASE_URL;
    if (!database || !/(test|review|ci)/i.test(new URL(database).pathname))
      throw new Error('Use an isolated test/review database for setup tests.');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('shows only current operational counts and blocked setup decisions to a global System Administrator', async () => {
    const admin = await actor('SYSADMIN', 'SYSTEM', 'GLOBAL');
    const unit = await db.institutionUnit.create({
      data: { code: `DEMO-${randomUUID()}` },
    });
    await db.institutionUnitVersion.create({
      data: {
        unitId: unit.id,
        version: 1,
        name: 'Fictional campus',
        unitType: 'CAMPUS',
      },
    });
    const building = await db.teachingBuilding.create({
      data: {
        campusUnitId: unit.id,
        code: 'B1',
        name: 'Fictional building',
      },
    });
    await db.teachingVenue.create({
      data: {
        buildingId: building.id,
        code: 'R1',
        name: 'Fictional room',
        teachingCapacity: 20,
      },
    });
    const programmeCount = await db.programme.count();
    const unitCount = await db.institutionUnit.count();
    const venueCount = await db.teachingVenue.count();
    const courseOnlyRegistrations = await db.courseRegistration.count({
      where: { status: 'ENROLLED' },
    });
    const response = await request(app.getHttpServer())
      .get('/institution-setup/readiness')
      .set('Cookie', admin.cookie)
      .expect(200);
    const body = response.body as {
      overall: string;
      sampledAt: string;
      sections: Array<{
        id: string;
        status: string;
        reason: string;
        counts?: Record<string, number>;
        gapIds: string[];
      }>;
    };
    expect(body.overall).toBe('BLOCKED');
    expect(Date.parse(body.sampledAt)).not.toBeNaN();
    expect(
      body.sections.find((section) => section.id === 'catalogue')?.counts
        ?.programmes,
    ).toBe(programmeCount);
    expect(
      body.sections.find((section) => section.id === 'organization')?.gapIds,
    ).toContain('GAP-004');
    expect(
      body.sections.find((section) => section.id === 'organization')?.counts
        ?.units,
    ).toBe(unitCount);
    expect(
      body.sections.find((section) => section.id === 'organization')?.status,
    ).toBe('BLOCKED');
    expect(
      body.sections.find((section) => section.id === 'organization')?.reason,
    ).toContain('Draft structure records exist');
    expect(
      body.sections.find((section) => section.id === 'teaching-delivery')
        ?.counts?.venues,
    ).toBe(venueCount);
    expect(
      body.sections.find((section) => section.id === 'teaching-delivery')
        ?.counts?.courseOnlyRegistrations,
    ).toBe(courseOnlyRegistrations);
    expect(
      body.sections.find((section) => section.id === 'teaching-delivery')
        ?.gapIds,
    ).toContain('GAP-021');
    expect(
      body.sections.find((section) => section.id === 'teaching-delivery')
        ?.status,
    ).toBe('BLOCKED');
    expect(
      body.sections.find((section) => section.id === 'authority')?.gapIds,
    ).toContain('GAP-V2-001');
    expect(body.sections.every((section) => section.status !== 'READY')).toBe(
      true,
    );
    expect(JSON.stringify(body)).not.toContain('Fictional setup operator');
    expect(JSON.stringify(body)).not.toContain('sis_local_only');
    const audit = await db.auditEvent.findFirst({
      where: {
        action: 'InstitutionSetupReadinessViewed',
        outcome: 'ALLOW',
      },
      orderBy: { occurredAt: 'desc' },
    });
    expect(audit?.purpose).toBe('institution-setup-readiness');
  });

  it('denies anonymous, unrelated and non-global administrator workspaces', async () => {
    await request(app.getHttpServer())
      .get('/institution-setup/readiness')
      .expect(401);
    const admissions = await actor('ADMISSIONS_OFFICER', 'INTAKE', '2026');
    await request(app.getHttpServer())
      .get('/institution-setup/readiness')
      .set('Cookie', admissions.cookie)
      .expect(403);
    const localAdmin = await actor('SYSADMIN', 'SYSTEM', 'OTHER');
    await request(app.getHttpServer())
      .get('/institution-setup/readiness')
      .set('Cookie', localAdmin.cookie)
      .expect(403);
  });

  it('rechecks revocation on every read', async () => {
    const admin = await actor('SYSADMIN', 'SYSTEM', 'GLOBAL');
    await request(app.getHttpServer())
      .get('/institution-setup/readiness')
      .set('Cookie', admin.cookie)
      .expect(200);
    await db.roleAssignment.update({
      where: { id: admin.assignmentId },
      data: { revokedAt: new Date() },
    });
    await request(app.getHttpServer())
      .get('/institution-setup/readiness')
      .set('Cookie', admin.cookie)
      .expect(403);
  });

  it('denies expired appointments and exposes no setup write method', async () => {
    const admin = await actor('SYSADMIN', 'SYSTEM', 'GLOBAL');
    await db.roleAssignment.update({
      where: { id: admin.assignmentId },
      data: { endsAt: new Date('2021-01-01T00:00:00.000Z') },
    });
    await request(app.getHttpServer())
      .get('/institution-setup/readiness')
      .set('Cookie', admin.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .post('/institution-setup/readiness')
      .set('Cookie', admin.cookie)
      .send({ approved: true })
      .expect(404);
  });
});
