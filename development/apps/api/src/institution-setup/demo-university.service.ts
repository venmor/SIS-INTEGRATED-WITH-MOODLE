import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { verify } from 'argon2';
import type {
  Prisma,
  DemoInstitutionSetupVersion,
  DemoInstitutionSetupActivation,
} from '@prisma/client';
import { DEMO_UNIVERSITY_TEMPLATE } from '@sis/config';
import type {
  DemoUniversityProfile,
  DemoUniversityVersion,
  DemoUniversitySetupReport,
} from '@sis/contracts';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  DEMO_SETUP_POLICY,
  SETUP_SCOPE,
  demoSetupEnabled,
  parseSetupCommand,
  parseActivationCommand,
  profileDigest,
} from './demo-setup-policy.js';

type Db = Prisma.TransactionClient;
const PROPOSE = 'institution-demo-setup-propose';
const APPROVE = 'institution-demo-setup-approve';
const fields = {
  createdBy: {
    select: { personId: true, person: { select: { displayName: true } } },
  },
  activation: {
    include: {
      approvedBy: { select: { person: { select: { displayName: true } } } },
    },
  },
} as const;
type VersionRow = Prisma.DemoInstitutionSetupVersionGetPayload<{
  include: typeof fields;
}>;

@Injectable()
export class DemoUniversitySetupService {
  constructor(private readonly prisma: PrismaService) {}

  private async lockAuthority(db: Db, actor: ActiveAuthority) {
    // IAM writers use ordinary row updates, not this domain's advisory lock.
    // Hold these rows through commit so authority cannot change mid-command.
    await db.$queryRaw`SELECT r."id" FROM "RoleAssignment" r
      JOIN "Account" a ON a."id" = r."accountId"
      JOIN "Person" p ON p."id" = a."personId"
      WHERE r."id" = ${actor.assignmentId ?? ''} AND a."id" = ${actor.accountId}
      FOR SHARE OF r, a, p`;
  }

  private async appointment(
    db: Db,
    actor: ActiveAuthority,
    capability?: string,
  ) {
    if (!demoSetupEnabled()) throw new NotFoundException();
    if (actor.activeRole !== 'DOMAIN_ADMIN' || !actor.assignmentId)
      throw new ForbiddenException(
        'Switch to your appointed fictional university setup workspace.',
      );
    const now = new Date();
    const assignment = await db.roleAssignment.findFirst({
      where: {
        id: actor.assignmentId,
        accountId: actor.accountId,
        role: 'DOMAIN_ADMIN',
        scopeType: 'SYSTEM',
        scopeRef: SETUP_SCOPE,
        capabilities: capability
          ? { has: capability }
          : { hasSome: [PROPOSE, APPROVE] },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: {
          status: { equals: 'ACTIVE', mode: 'insensitive' },
          person: { status: 'ACTIVE' },
        },
      },
      select: {
        id: true,
        capabilities: true,
        account: { select: { personId: true } },
      },
    });
    if (!assignment)
      throw new ForbiddenException(
        'Your fictional setup appointment is inactive or outside this action.',
      );
    return assignment;
  }
  private latestActivation(db: Db) {
    return db.demoInstitutionSetupActivation.findFirst({
      orderBy: { setupVersion: { version: 'desc' } },
      include: { setupVersion: { include: fields } },
    });
  }
  private projection(row: VersionRow, personId: string): DemoUniversityVersion {
    return {
      id: row.id,
      version: row.version,
      profile: row.profile as unknown as DemoUniversityProfile,
      reason: row.reason,
      contentDigest: row.contentDigest,
      baseActivationId: row.baseActivationId,
      createdAt: row.createdAt.toISOString(),
      createdByName: row.createdBy.person.displayName,
      ownProposal: row.createdBy.personId === personId,
      activation: row.activation
        ? {
            id: row.activation.id,
            approvedAt: row.activation.approvedAt.toISOString(),
            approvedByName: row.activation.approvedBy.person.displayName,
          }
        : null,
    };
  }
  async report(
    actor: ActiveAuthority,
    beforeVersion?: number,
  ): Promise<DemoUniversitySetupReport> {
    await this.appointment(this.prisma, actor);
    return this.prisma.$transaction(
      async (db) => {
        await this.lockAuthority(db, actor);
        const appointment = await this.appointment(db, actor);
        // A transaction uses one PostgreSQL client. Query it sequentially and
        // count only explicitly managed identities, not unrelated DEMO-* data.
        const page = await db.demoInstitutionSetupVersion.findMany({
          where: beforeVersion ? { version: { lt: beforeVersion } } : {},
          orderBy: { version: 'desc' },
          take: 21,
          include: fields,
        });
        const versions = page.slice(0, 20);
        const latest = beforeVersion
          ? await db.demoInstitutionSetupVersion.findFirst({
              orderBy: { version: 'desc' },
              select: { version: true },
            })
          : versions[0];
        const active = await this.latestActivation(db);
        const profile = active?.setupVersion.profile as unknown as
          DemoUniversityProfile | undefined;
        const unitCodes = (profile ?? DEMO_UNIVERSITY_TEMPLATE).units.map(
          (unit) => unit.code,
        );
        const deliveryOfferings = await db.courseDeliveryOffering.count({
          where: {
            OR: [
              { campusUnit: { code: { in: unitCodes } } },
              { deliveryUnit: { code: { in: unitCodes } } },
            ],
          },
        });
        const buildings = await db.teachingBuilding.count({
          where: { campusUnit: { code: { in: unitCodes } } },
        });
        const timetableRules = await db.timetableDemoRuleDraft.count({
          where: { campusUnit: { code: { in: unitCodes } } },
        });
        const masterPreviews = await db.timetableDemoMasterDraft.count({
          where: { ruleDraft: { campusUnit: { code: { in: unitCodes } } } },
        });
        return {
          mode: 'FICTIONAL_REHEARSAL',
          policyVersion: DEMO_SETUP_POLICY,
          canPropose: appointment.capabilities.includes(PROPOSE),
          canApprove: appointment.capabilities.includes(APPROVE),
          latestVersion: latest?.version ?? 0,
          activeActivationId: active?.id ?? null,
          activeVersion: active
            ? this.projection(active.setupVersion, appointment.account.personId)
            : null,
          versions: versions.map((row) =>
            this.projection(row, appointment.account.personId),
          ),
          olderVersionCursor:
            page.length > 20 ? versions.at(-1)!.version : null,
          template: DEMO_UNIVERSITY_TEMPLATE,
          impact: {
            deliveryOfferings,
            buildings,
            timetableRules,
            masterPreviews,
          },
          handoffs: [
            {
              label: 'Registration calendar',
              status: 'PENDING',
              reason:
                'Legacy registration windows need owner-controlled reconciliation; activation does not change them.',
            },
            {
              label: 'Catalogue and curricula',
              status: 'PENDING',
              reason:
                'Programme, curriculum and course policy workflows remain separate owner releases.',
            },
            {
              label: 'Timetable membership and publication',
              status: 'PENDING',
              reason:
                'Official section mapping, independent timetable approval and student publication are next.',
            },
            {
              label: 'Institutional activation',
              status: 'PENDING',
              reason:
                'Live authority, staff MFA, IAM scope reconciliation and operating approval remain required.',
            },
          ],
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  private async lock(db: Db) {
    // Fixed domain/profile lock serialises drafts, activation and projections.
    await db.$queryRaw`SELECT pg_advisory_xact_lock(260007, 3)::text`;
  }
  private async audit(
    db: Db,
    actor: ActiveAuthority,
    action: string,
    targetRef: string,
    requestId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    await db.auditEvent.create({
      data: {
        action,
        outcome: 'ALLOW',
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        targetRef,
        idempotencyRef: requestId,
        purpose: 'fictional-university-setup',
        policyVersion: DEMO_SETUP_POLICY,
        correlationId: randomUUID(),
        metadata: { assignmentId: actor.assignmentId, ...metadata },
      },
    });
  }
  async save(actor: ActiveAuthority, raw: unknown) {
    await this.appointment(this.prisma, actor, PROPOSE);
    const command = parseSetupCommand(raw);
    const digest = profileDigest(command);
    return this.prisma.$transaction(
      async (db) => {
        await this.lock(db);
        await this.lockAuthority(db, actor);
        await this.appointment(db, actor, PROPOSE);
        const existing = await db.demoInstitutionSetupVersion.findUnique({
          where: {
            createdByAccountId_clientRequestId: {
              createdByAccountId: actor.accountId,
              clientRequestId: command.clientRequestId,
            },
          },
        });
        if (existing) {
          if (existing.contentDigest !== digest)
            throw new ConflictException(
              'This save reference belongs to different changes. Your draft has not overwritten them.',
            );
          return {
            id: existing.id,
            version: existing.version,
            status: 'FICTIONAL_DRAFT',
          };
        }
        const latest = await db.demoInstitutionSetupVersion.findFirst({
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const active = await this.latestActivation(db);
        if (
          (latest?.version ?? 0) !== command.expectedVersion ||
          (active?.id ?? null) !== command.expectedActivationId
        )
          throw new ConflictException(
            'Setup changed while you were editing. Keep your entries and reload the current version before saving.',
          );
        const row = await db.demoInstitutionSetupVersion.create({
          data: {
            version: command.expectedVersion + 1,
            profile: command.profile as unknown as Prisma.InputJsonObject,
            reason: command.reason,
            contentDigest: digest,
            baseActivationId: command.expectedActivationId,
            createdByAccountId: actor.accountId,
            createdByAssignmentId: actor.assignmentId!,
            clientRequestId: command.clientRequestId,
            policyVersion: DEMO_SETUP_POLICY,
          },
        });
        await this.audit(
          db,
          actor,
          'DemoInstitutionSetupDraftSaved',
          row.id,
          command.clientRequestId,
          { version: row.version, digest },
        );
        return { id: row.id, version: row.version, status: 'FICTIONAL_DRAFT' };
      },
      { timeout: 20_000 },
    );
  }

  /** Validate dependent identities; never rewrite their authoritative records. */
  private async checkSources(
    db: Db,
    profile: DemoUniversityProfile,
    activeProfile?: DemoUniversityProfile,
  ) {
    const units = new Map(profile.units.map((u) => [u.code, u]));
    const periods = new Map(profile.periods.map((p) => [p.code, p]));
    const unitCodes = [...units.keys()];
    const kind = (code: string) =>
      profile.unitTypes.find((t) => t.code === units.get(code)?.typeCode)?.kind;
    if (activeProfile) {
      if (activeProfile.rootUnitCode !== profile.rootUnitCode)
        throw new ConflictException(
          'Keep the stable institution code. Rename its label instead.',
        );
      for (const unit of activeProfile.units)
        if (
          !units.has(unit.code) ||
          kind(unit.code) !==
            activeProfile.unitTypes.find((t) => t.code === unit.typeCode)?.kind
        )
          throw new ConflictException(
            `Keep the identity and category of ${unit.code}. Retirement needs an owner reconciliation workflow.`,
          );
      for (const period of activeProfile.periods)
        if (
          !periods.has(period.code) ||
          periods.get(period.code)!.typeCode !== period.typeCode
        )
          throw new ConflictException(
            `Keep the identity and type of ${period.code}. Calendar replacement must preserve history.`,
          );
    }
    const offerings = await db.courseDeliveryOffering.findMany({
      where: {
        OR: [
          { campusUnit: { code: { in: unitCodes } } },
          { deliveryUnit: { code: { in: unitCodes } } },
        ],
      },
      take: 1001,
      select: {
        campusUnit: { select: { code: true } },
        deliveryUnit: { select: { code: true } },
        period: { select: { code: true } },
      },
    });
    const buildings = await db.teachingBuilding.findMany({
      where: { campusUnit: { code: { in: unitCodes } } },
      take: 1001,
      select: { campusUnit: { select: { code: true } } },
    });
    const rules = await db.timetableDemoRuleDraft.findMany({
      where: { campusUnit: { code: { in: unitCodes } } },
      take: 1001,
      select: {
        campusUnit: { select: { code: true } },
        period: { select: { code: true } },
        teachingStartDate: true,
        teachingEndDate: true,
      },
    });
    if ([offerings, buildings, rules].some((rows) => rows.length > 1000))
      throw new ConflictException(
        'This setup needs a larger owner reconciliation review before activation.',
      );
    for (const offering of offerings)
      if (
        kind(offering.campusUnit.code) !== 'CAMPUS' ||
        !units.has(offering.deliveryUnit.code) ||
        !periods.has(offering.period.code)
      )
        throw new ConflictException(
          'Keep the configured campus, delivery unit and period used by existing course offerings.',
        );
    for (const building of buildings)
      if (kind(building.campusUnit.code) !== 'CAMPUS')
        throw new ConflictException(
          'Keep the campus used by existing buildings.',
        );
    for (const rule of rules) {
      if (kind(rule.campusUnit.code) !== 'CAMPUS')
        throw new ConflictException(
          'Keep the campus used by saved timetable rules.',
        );
      if (rule.period) {
        const period = periods.get(rule.period.code);
        if (
          !period ||
          (rule.teachingStartDate &&
            rule.teachingStartDate.toISOString().slice(0, 10) <
              period.startDate) ||
          (rule.teachingEndDate &&
            rule.teachingEndDate.toISOString().slice(0, 10) > period.endDate)
        )
          throw new ConflictException(
            'Keep saved timetable teaching windows within their configured calendar period.',
          );
      }
    }
  }
  private async installStructure(
    db: Db,
    row: DemoInstitutionSetupVersion,
    profile: DemoUniversityProfile,
    effectiveFrom: Date,
  ) {
    const ids = new Map<string, string>();
    for (const unit of profile.units) {
      const identity = await db.institutionUnit.upsert({
        where: { code: unit.code },
        update: {},
        create: { code: unit.code },
      });
      const last = await db.institutionUnitVersion.findFirst({
        where: { unitId: identity.id },
        orderBy: { version: 'desc' },
        select: { version: true, unitType: true, unitKind: true },
      });
      const unitKind = profile.unitTypes.find(
        (t) => t.code === unit.typeCode,
      )!.kind;
      if (
        last &&
        (last.unitKind === 'CAMPUS' || last.unitType === 'CAMPUS') &&
        unitKind !== 'CAMPUS'
      )
        throw new ConflictException(`Keep ${unit.code} as a campus.`);
      await db.institutionUnitVersion.create({
        data: {
          unitId: identity.id,
          version: (last?.version ?? 0) + 1,
          name: unit.name,
          unitType: unit.typeCode,
          unitKind,
          status: 'DEMO_ACTIVE',
          setupVersionId: row.id,
          effectiveFrom,
        },
      });
      ids.set(unit.code, identity.id);
    }
    for (const relation of profile.relationships)
      await db.institutionUnitRelationship.create({
        data: {
          fromUnitId: ids.get(relation.fromCode)!,
          toUnitId: ids.get(relation.toCode)!,
          relationshipType: relation.type,
          effectiveFrom,
          setupVersionId: row.id,
        },
      });
  }
  private async installCalendar(
    db: Db,
    row: DemoInstitutionSetupVersion,
    profile: DemoUniversityProfile,
  ) {
    for (const period of profile.periods) {
      const identity = await db.academicPeriod.upsert({
        where: { code: period.code },
        update: {},
        create: { code: period.code },
      });
      const latest = await db.academicPeriodVersion.findFirst({
        where: { periodId: identity.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      await db.academicPeriodVersion.create({
        data: {
          periodId: identity.id,
          version: (latest?.version ?? 0) + 1,
          name: period.name,
          periodType: period.typeCode,
          parentCode: period.parentCode,
          startDate: new Date(`${period.startDate}T00:00:00.000Z`),
          endDate: new Date(`${period.endDate}T00:00:00.000Z`),
          setupVersionId: row.id,
        },
      });
    }
  }
  async activate(actor: ActiveAuthority, id: string, raw: unknown) {
    await this.appointment(this.prisma, actor, APPROVE);
    const command = parseActivationCommand(raw);
    // No secret in digest or audit. Reconfirm against the live credential in the
    // transaction; a proof cannot be borrowed by another actor/target command.
    const commandDigest = createHash('sha256')
      .update(
        JSON.stringify({
          id,
          contentDigest: command.contentDigest,
          base: command.expectedActivationId,
          confirm: true,
        }),
      )
      .digest('hex');
    return this.prisma.$transaction(
      async (db) => {
        await this.lock(db);
        await this.lockAuthority(db, actor);
        const appointment = await this.appointment(db, actor, APPROVE);
        const credentials = await db.$queryRaw<
          { secretHash: string }[]
        >`SELECT "secretHash" FROM "Credential"
        WHERE "accountId" = ${actor.accountId} AND "kind" = 'PASSWORD' AND "status" = 'ACTIVE' AND "supersededAt" IS NULL FOR SHARE`;
        const credential =
          credentials.length === 1 ? credentials[0] : undefined;
        let verified = false;
        try {
          verified =
            !!credential &&
            (await verify(credential.secretHash, command.password));
        } catch {
          /* fail closed */
        }
        if (!verified)
          throw new ForbiddenException(
            'Password reconfirmation failed. This fictional version was not activated.',
          );
        const existing = await db.demoInstitutionSetupActivation.findUnique({
          where: {
            approvedByAccountId_clientRequestId: {
              approvedByAccountId: actor.accountId,
              clientRequestId: command.clientRequestId,
            },
          },
        });
        if (existing) {
          if (existing.commandDigest !== commandDigest)
            throw new ConflictException(
              'This approval reference belongs to another decision.',
            );
          return this.receipt(existing);
        }
        const row = await db.demoInstitutionSetupVersion.findUnique({
          where: { id },
          include: {
            createdBy: { select: { personId: true } },
            activation: true,
          },
        });
        if (!row) throw new NotFoundException();
        if (row.activation)
          throw new ConflictException(
            'This version is already activated. Open its recorded decision.',
          );
        if (
          row.policyVersion !== DEMO_SETUP_POLICY ||
          row.contentDigest !== command.contentDigest
        )
          throw new ConflictException(
            'The reviewed version does not match this decision. Reload the saved version.',
          );
        const proposer: ActiveAuthority = {
          accountId: row.createdByAccountId,
          assignmentId: row.createdByAssignmentId,
          activeRole: 'DOMAIN_ADMIN',
          scope: `SYSTEM:${SETUP_SCOPE}`,
        };
        await this.lockAuthority(db, proposer);
        const proposerAppointment = await this.appointment(
          db,
          proposer,
          PROPOSE,
        );
        if (
          proposerAppointment.account.personId === appointment.account.personId
        )
          throw new ForbiddenException(
            'Another person must independently review and approve your proposed version.',
          );
        const active = await this.latestActivation(db);
        if (
          (active?.id ?? null) !== command.expectedActivationId ||
          row.baseActivationId !== command.expectedActivationId
        )
          throw new ConflictException(
            'The active setup changed. Create and review a new draft against the current version.',
          );
        const parsed = parseSetupCommand({
          clientRequestId: row.clientRequestId,
          expectedVersion: row.version - 1,
          expectedActivationId: row.baseActivationId,
          reason: row.reason,
          profile: row.profile,
        });
        if (profileDigest(parsed) !== row.contentDigest)
          throw new ConflictException(
            'The saved version did not pass its integrity check.',
          );
        await this.checkSources(
          db,
          parsed.profile,
          active?.setupVersion.profile as unknown as
            DemoUniversityProfile | undefined,
        );
        const approvedAt = new Date();
        await this.installStructure(db, row, parsed.profile, approvedAt);
        await this.installCalendar(db, row, parsed.profile);
        // Row locks prevent edits; they cannot stop time-bound authority expiring.
        await this.appointment(db, actor, APPROVE);
        await this.appointment(db, proposer, PROPOSE);
        const activation = await db.demoInstitutionSetupActivation.create({
          data: {
            setupVersionId: row.id,
            previousActivationId: active?.id ?? null,
            approvedByAccountId: actor.accountId,
            approvedByAssignmentId: actor.assignmentId!,
            authenticationStrength: 'DEMO_PASSWORD_RECONFIRMATION',
            approvalMeaning:
              'Reviewed and approved for fictional rehearsal only',
            contentDigest: row.contentDigest,
            commandDigest,
            clientRequestId: command.clientRequestId,
            policyVersion: DEMO_SETUP_POLICY,
            approvedAt,
          },
        });
        await this.audit(
          db,
          actor,
          'DemoInstitutionSetupActivated',
          row.id,
          command.clientRequestId,
          {
            activationId: activation.id,
            version: row.version,
            digest: row.contentDigest,
            previousActivationId: active?.id ?? null,
            authenticationStrength: activation.authenticationStrength,
          },
        );
        await db.outboxEvent.create({
          data: {
            aggregate: 'DemoInstitutionSetup',
            aggregateId: row.id,
            type: 'DemoInstitutionSetupActivated',
            payload: {
              activationId: activation.id,
              setupVersionId: row.id,
              previousActivationId: active?.id ?? null,
              policyVersion: DEMO_SETUP_POLICY,
              ownerReconciliation: 'PENDING',
              externalDelivery: 'NONE',
            },
          },
        });
        return this.receipt(activation);
      },
      { timeout: 25_000 },
    );
  }
  private receipt(row: DemoInstitutionSetupActivation) {
    return {
      activationId: row.id,
      setupVersionId: row.setupVersionId,
      status: 'FICTIONAL_ACTIVE',
      approvedAt: row.approvedAt.toISOString(),
    };
  }
}
