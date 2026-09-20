import { Injectable, HttpException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { APPLICATION_DEMO_V1 as policy } from '@sis/config';
import type {
  ApplicationView,
  ApplicationSection,
  ApplicationOffering,
  SubmissionReceipt,
  ApplicationError,
  ApplicationDocument,
} from '@sis/contracts';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { validateSection, type Fields } from './validation.js';
import { DocumentScanner, actualMime } from './scanner.js';
import type {
  StartDto,
  SaveDto,
  ChangeDto,
  ConfirmDto,
  DocumentDto,
  SubmitDto,
  VersionDto,
} from './dto.js';
type Tx = Prisma.TransactionClient;
const include = {
  offering: {
    include: {
      programme: { include: { rules: { include: { route: true } } } },
    },
  },
  documents: { orderBy: { createdAt: 'asc' as const } },
  submission: true,
} satisfies Prisma.ApplicationInclude;
type Row = Prisma.ApplicationGetPayload<{ include: typeof include }>;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const digest = (v: unknown) =>
  createHash('sha256').update(canonical(v)).digest('hex');
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: DocumentScanner,
  ) {}
  fail(
    code: string,
    message: string,
    status = 409,
    extra: Partial<ApplicationError> = {},
  ): never {
    throw new HttpException(
      {
        code,
        message,
        saved: false,
        supportReference: randomUUID(),
        nextAction:
          'Review the latest saved application, correct the highlighted issue, or contact Admissions.',
        ...extra,
      },
      status,
    );
  }
  async actor(db: Tx, actor: ActiveAuthority) {
    if (actor.activeRole !== 'APP' || !actor.assignmentId)
      this.fail(
        'APPLICANT_WORKSPACE',
        'Select your applicant workspace to continue.',
        403,
      );
    const now = new Date();
    const role = await db.roleAssignment.findFirst({
      where: {
        id: actor.assignmentId,
        accountId: actor.accountId,
        role: 'APP',
        scopeType: 'APPLICATION',
        capabilities: { has: 'apply' },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
      include: { account: { include: { person: true } } },
    });
    if (!role)
      this.fail(
        'APPLICANT_WORKSPACE',
        'This applicant workspace is unavailable. Sign in again or contact support.',
        403,
      );
    return role.account.person;
  }
  async own(db: Tx, actor: ActiveAuthority, id: string) {
    const row = await db.application.findFirst({
      where: { id, accountId: actor.accountId },
      include,
    });
    if (!row) this.fail('NOT_FOUND', 'Application not found.', 404);
    return row;
  }
  policy() {
    return {
      ...policy,
      upload: {
        ...policy.upload,
        scanner:
          process.env.APPLICATION_SCANNER === 'demo-fixtures' &&
          process.env.DEMO_MODE === 'true'
            ? 'DEMO-EXACT-FIXTURE-v1 (bundled fictional documents only)'
            : 'ClamAV; PDF structural validation pending',
      },
    };
  }
  supportsPolicy(offering: Row['offering']) {
    return (
      offering.programme.rules.length > 0 &&
      offering.programme.feeScheduleRef.startsWith('DEMO-ACADEMIC-2026-v1/')
    );
  }
  fingerprint(offering: Row['offering']) {
    return `${offering.programme.publishedVersion}:${digest({
      feeScheduleRef: offering.programme.feeScheduleRef,
      rules: offering.programme.rules
        .map((r) => ({
          key: r.ruleKey,
          label: r.label,
          version: r.version,
          route: r.route?.code,
          kind: r.kind,
          mandatory: r.mandatory,
          minGrade: r.minGrade,
          evidence: r.evidence,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    })}`;
  }
  offering(row: Row): ApplicationOffering {
    const o = row.offering;
    return {
      id: o.id,
      programmeName: o.programme.name,
      programmeCode: o.programme.code,
      intake: o.intake,
      studyMode: o.studyMode,
      campus: o.campus,
      deadline: o.deadline?.toISOString() ?? null,
      requirementVersion: row.requirementVersion,
    };
  }
  open(row: Row) {
    return (
      row.offering.availability === 'OPEN' &&
      row.offering.deadline !== null &&
      row.offering.deadline > new Date()
    );
  }
  editable(row: Row, version: number) {
    if (['Submitted', 'Discarded'].includes(row.state))
      this.fail(
        'LOCKED',
        'This application is no longer editable. View its saved record.',
      );
    if (row.version !== version)
      this.fail(
        'VERSION_CONFLICT',
        'This application was updated elsewhere. Your changes were not applied. Review differences before saving.',
        409,
        { currentVersion: row.version },
      );
    if (!this.open(row))
      this.fail(
        'DEADLINE',
        'This intake is closed. Your previously saved draft remains available, but it was not submitted.',
      );
    if (!this.supportsPolicy(row.offering))
      this.fail(
        'POLICY_UNAVAILABLE',
        'Application requirements or fee policy are unavailable. Contact Admissions.',
      );
    if (
      row.policyVersion !== policy.version ||
      row.requirementVersion !== this.fingerprint(row.offering)
    )
      this.fail(
        'POLICY_CHANGED',
        'Requirements have changed. Review the programme change impact before continuing.',
      );
  }
  requiredDocuments(row: Row) {
    const route = (row.qualifications as Fields).routeCode;
    return [
      {
        category: 'qualification',
        label: 'Qualification result statement',
        purpose:
          'To support the qualifications you declared; formal verification happens during assessment.',
      },
      ...(route === 'INTL'
        ? [
            {
              category: 'equivalency',
              label: 'Equivalency evidence',
              purpose: 'To support a later authorized equivalency assessment.',
            },
          ]
        : []),
    ];
  }
  async view(
    db: Tx,
    actor: ActiveAuthority,
    row: Row,
  ): Promise<ApplicationView> {
    const person = await this.actor(db, actor);
    const blockers: ApplicationView['blockers'] = [];
    const labels = {
      personal: 'Personal details',
      contact: 'Contact details',
      qualifications: 'Qualifications and results',
    };
    const sections = Object.entries(labels).map(([key, label]) => {
      const values = row[key as ApplicationSection] as Fields;
      const errors = validateSection(
        key as ApplicationSection,
        values,
        {},
        true,
      ).errors;
      for (const [field, message] of Object.entries(errors))
        blockers.push({ section: key, field, message });
      return {
        key,
        label,
        state: Object.keys(errors).length
          ? Object.keys(values).length
            ? 'In progress'
            : 'Not started'
          : 'Complete',
      };
    });
    const q = row.qualifications as Fields;
    if (q.routeCode === 'ECZ') {
      const required = row.offering.programme.rules.filter(
        (r) =>
          r.mandatory &&
          r.kind === 'GRADE' &&
          (!r.route || r.route.code === 'ECZ'),
      );
      for (const rule of required)
        if (
          !(
            q.subjects as { subject: string; grade: number }[] | undefined
          )?.some((s) => s.subject === rule.label)
        )
          blockers.push({
            section: 'qualifications',
            field: 'subjects',
            message: `Declare the ${rule.label} result required for this programme.`,
          });
    }
    if (
      !q.routeCode ||
      !row.offering.programme.rules.some((r) => r.route?.code === q.routeCode)
    )
      blockers.push({
        section: 'qualifications',
        field: 'routeCode',
        message:
          'Select a qualification route with published requirements for this programme.',
      });
    if (blockers.some((b) => b.section === 'qualifications'))
      sections[2].state = Object.keys(q).length
        ? 'Needs attention'
        : 'Not started';
    const docs = row.documents.map((d) => ({
      id: d.id,
      category: d.category,
      fileName: d.fileName,
      mimeType: d.mimeType,
      size: d.size,
      status: d.status as ApplicationDocument['status'],
      statusLabel:
        (
          {
            SecurityScanPending: 'Checking file safety',
            SecurityScanFailed: 'File could not be accepted',
            AwaitingQualityCheck: 'Received; checking readability',
            Withdrawn: 'Replaced or withdrawn',
          } as Record<string, string>
        )[d.status] ?? 'Checking file safety',
      version: d.version,
      replacesId: d.replacesId,
      createdAt: d.createdAt.toISOString(),
      canPreview: d.status === 'AwaitingQualityCheck',
      scanner: d.scanner,
    }));
    for (const required of this.requiredDocuments(row))
      if (
        !docs.some(
          (d) =>
            d.category === required.category &&
            d.status === policy.upload.minimumStage,
        )
      )
        blockers.push({
          section: 'documents',
          message: `${required.label} must pass the configured file-safety check.`,
        });
    sections.push({
      key: 'documents',
      label: 'Supporting documents',
      state: blockers.some((b) => b.section === 'documents')
        ? 'Needs attention'
        : 'Complete',
    });
    if (!person.emailVerifiedAt && !person.phoneVerifiedAt)
      blockers.push({
        section: 'contact',
        message:
          'Verify an account contact before submitting. Application contact fields cannot verify account contacts.',
      });
    const changed =
      row.requirementVersion !== this.fingerprint(row.offering) ||
      row.policyVersion !== policy.version ||
      !this.supportsPolicy(row.offering);
    if (changed)
      blockers.push({
        section: 'programme',
        message:
          'Programme requirements changed. Review the change before continuing.',
      });
    if (!this.open(row))
      blockers.push({
        section: 'programme',
        message: 'This intake is closed according to server time.',
      });
    const editable =
      !['Submitted', 'Discarded'].includes(row.state) &&
      this.open(row) &&
      !changed;
    return {
      id: row.id,
      reference: row.reference,
      state: row.state as ApplicationView['state'],
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      editable,
      lockReason: editable
        ? null
        : row.state === 'Submitted'
          ? 'Submitted applications cannot be edited directly.'
          : row.state === 'Discarded'
            ? 'This draft was discarded.'
            : changed
              ? 'Programme requirements changed.'
              : 'The application deadline has passed or the intake is closed.',
      offering: this.offering(row),
      policyVersion: row.policyVersion,
      personal: row.personal as Fields,
      contact: row.contact as Fields,
      qualifications: row.qualifications as Fields,
      verifiedContact: {
        email: person.email
          ? person.email.replace(/^(.).+(@.*)$/, '$1•••$2')
          : null,
        phone: person.phone ? `•••${person.phone.slice(-4)}` : null,
        emailVerified: !!person.emailVerifiedAt,
        phoneVerified: !!person.phoneVerifiedAt,
      },
      sections,
      completeCount: sections.filter((s) => s.state === 'Complete').length,
      requiredCount: sections.length,
      documents: docs,
      requiredDocuments: this.requiredDocuments(row),
      blockers,
      receipt:
        (row.submission?.receipt as unknown as SubmissionReceipt) ?? null,
      requirementChanged: changed,
    };
  }
  async list(actor: ActiveAuthority) {
    await this.actor(this.prisma, actor);
    const rows = await this.prisma.application.findMany({
      where: { accountId: actor.accountId, state: { not: 'Discarded' } },
      orderBy: { offering: { deadline: 'asc' } },
      take: 50,
      include,
    });
    return {
      items: await Promise.all(
        rows.map((r) => this.view(this.prisma, actor, r)),
      ),
    };
  }
  async get(actor: ActiveAuthority, id: string) {
    await this.actor(this.prisma, actor);
    return this.view(
      this.prisma,
      actor,
      await this.own(this.prisma, actor, id),
    );
  }
  async audit(
    db: Tx,
    actor: ActiveAuthority,
    action: string,
    id: string,
    key: string,
    outcome = 'ALLOW',
    metadata: unknown = {},
  ) {
    await db.auditEvent.create({
      data: {
        action,
        actorAccountId: actor.accountId,
        activeRole: 'APP',
        scope: `APPLICATION:${id}`,
        targetRef: id,
        outcome,
        correlationId: randomUUID(),
        idempotencyRef: key,
        policyVersion: policy.version,
        purpose: 'Applicant self-service',
        metadata: json(metadata),
      },
    });
  }
  async command(
    actor: ActiveAuthority,
    key: string,
    action: string,
    payload: unknown,
    fn: (db: Tx) => Promise<{ status?: number; body: unknown }>,
  ) {
    const hash = digest(payload);
    try {
      const result = await this.prisma.$transaction(
        async (db) => {
          // Account-level lock serializes both max-application rules and writes from two devices.
          await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR UPDATE`;
          await this.actor(db, actor);
          const prior = await db.applicationCommand.findUnique({
            where: { key },
          });
          if (prior) {
            if (
              prior.accountId !== actor.accountId ||
              prior.action !== action ||
              prior.digest !== hash
            )
              this.fail(
                'IDEMPOTENCY_CONFLICT',
                'This request reference belongs to a different action. Review the current saved state.',
              );
            return { status: prior.status, body: prior.response };
          }
          const result = await fn(db);
          await db.applicationCommand.create({
            data: {
              key,
              accountId: actor.accountId,
              action,
              digest: hash,
              status: result.status ?? 200,
              response: json(result.body),
            },
          });
          return result;
        },
        { timeout: 20000 },
      );
      if ((result.status ?? 200) >= 400)
        throw new HttpException(result.body as object, result.status!);
      return result.body;
    } catch (error) {
      if (error instanceof HttpException) {
        await this.audit(
          this.prisma,
          actor,
          action,
          'own-application',
          key,
          'DENY',
          { status: error.getStatus() },
        ).catch(() => {});
        throw error;
      }
      this.fail(
        'SERVICE_UNAVAILABLE',
        'The application service could not confirm this action. Check the saved result before retrying the same request.',
        503,
      );
    }
  }
  async start(actor: ActiveAuthority, dto: StartDto) {
    return this.command(
      actor,
      dto.idempotencyKey,
      'StartApplication',
      dto,
      async (db) => {
        if (!dto.confirmed)
          this.fail(
            'CONFIRM',
            'Confirm the programme and intake before creating a draft.',
            400,
          );
        const person = await this.actor(db, actor);
        if (!person.emailVerifiedAt && !person.phoneVerifiedAt)
          this.fail(
            'CONTACT_UNVERIFIED',
            'Verify your account email or mobile before starting an application.',
          );
        const offering = await db.programmeOffering.findUnique({
          where: { id: dto.offeringId },
          include: {
            programme: { include: { rules: { include: { route: true } } } },
          },
        });
        if (
          !offering ||
          offering.availability !== 'OPEN' ||
          !offering.deadline ||
          offering.deadline <= new Date()
        )
          this.fail(
            'INTAKE_CLOSED',
            'This programme intake is unavailable or closed. Choose an open intake.',
          );
        if (
          !offering.programme.rules.length ||
          !offering.programme.feeScheduleRef.startsWith(
            'DEMO-ACADEMIC-2026-v1/',
          )
        )
          this.fail(
            'POLICY_UNAVAILABLE',
            'Application requirements or fee policy are unavailable. Contact Admissions.',
          );
        const existing = await db.application.findFirst({
          where: {
            accountId: actor.accountId,
            offeringId: dto.offeringId,
            state: { not: 'Discarded' },
          },
          include,
        });
        if (existing) return { body: await this.view(db, actor, existing) };
        const count = await db.application.count({
          where: {
            accountId: actor.accountId,
            offering: { intake: offering.intake },
            state: { not: 'Discarded' },
          },
        });
        if (count >= policy.maxActivePerIntake)
          this.fail(
            'APPLICATION_LIMIT',
            `This demonstration allows ${policy.maxActivePerIntake} active applications per intake.`,
          );
        const row = await db.application.create({
          data: {
            accountId: actor.accountId,
            offeringId: dto.offeringId,
            reference: `DRAFT-${randomUUID()}`,
            policyVersion: policy.version,
            requirementVersion: this.fingerprint(offering),
          },
          include,
        });
        await this.audit(
          db,
          actor,
          'ApplicationDraftCreated',
          row.id,
          dto.idempotencyKey,
        );
        return { body: await this.view(db, actor, row) };
      },
    );
  }
  async save(
    actor: ActiveAuthority,
    id: string,
    section: ApplicationSection,
    dto: SaveDto,
  ) {
    return this.command(
      actor,
      dto.idempotencyKey,
      'SaveApplicationDraft',
      { id, section, ...dto },
      async (db) => {
        const row = await this.own(db, actor, id);
        this.editable(row, dto.version);
        const result = validateSection(
          section,
          dto.data,
          row[section] as Fields,
          dto.complete,
        );
        const routeChanged =
          section === 'qualifications' &&
          (row.qualifications as Fields).routeCode !== result.data.routeCode;
        if (
          routeChanged &&
          (row.qualifications as Fields).routeCode &&
          !dto.confirmImpact
        )
          this.fail(
            'ROUTE_CHANGED',
            'Confirm the route change impact: previously uploaded documents will remain in history and new current-route evidence is required.',
          );
        if (routeChanged)
          await db.applicationDocument.updateMany({
            where: { applicationId: id, status: { not: 'Withdrawn' } },
            data: { status: 'Withdrawn' },
          });
        const updated = await db.application.update({
          where: { id },
          data: {
            [section]: json(result.data),
            version: { increment: 1 },
            state: 'InProgress',
          },
          include,
        });
        await db.applicationRevision.create({
          data: {
            applicationId: id,
            version: updated.version,
            section,
            data: json(result.data),
          },
        });
        await this.audit(
          db,
          actor,
          'ApplicationDraftSaved',
          id,
          dto.idempotencyKey,
          'ALLOW',
          {
            section,
            version: updated.version,
            fields: Object.keys(dto.data),
            requirementImpact: routeChanged,
          },
        );
        if (Object.keys(result.errors).length)
          return {
            status: 422,
            body: {
              code: 'VALIDATION',
              message:
                'Valid fields were saved. Correct the highlighted fields before continuing.',
              saved: true,
              currentVersion: updated.version,
              fieldErrors: result.errors,
              supportReference: randomUUID(),
              nextAction: 'Correct the highlighted fields and save again.',
            },
          };
        return { body: await this.view(db, actor, updated) };
      },
    );
  }
  async change(actor: ActiveAuthority, id: string, dto: ChangeDto) {
    return this.command(
      actor,
      dto.idempotencyKey,
      'ChangeApplicationProgrammeOffering',
      { id, ...dto },
      async (db) => {
        const row = await this.own(db, actor, id);
        if (!dto.confirmed)
          this.fail(
            'CONFIRM',
            'Review the impact and confirm the programme change.',
            400,
          );
        if (
          row.version !== dto.version ||
          ['Submitted', 'Discarded'].includes(row.state)
        )
          this.fail(
            'VERSION_CONFLICT',
            'Reload the current application before changing programme.',
          );
        const offering = await db.programmeOffering.findUnique({
          where: { id: dto.offeringId },
          include: {
            programme: { include: { rules: { include: { route: true } } } },
          },
        });
        if (
          !offering ||
          offering.availability !== 'OPEN' ||
          !offering.deadline ||
          offering.deadline <= new Date() ||
          !offering.programme.feeScheduleRef.startsWith(
            'DEMO-ACADEMIC-2026-v1/',
          ) ||
          !offering.programme.rules.length
        )
          this.fail(
            'INTAKE_CLOSED',
            'Choose an open offering with available requirements and fee policy.',
          );
        if (
          await db.application.findFirst({
            where: {
              accountId: actor.accountId,
              offeringId: offering.id,
              state: { not: 'Discarded' },
              id: { not: id },
            },
          })
        )
          this.fail(
            'DUPLICATE',
            'You already have an application for that offering. Continue it from applicant home.',
          );
        if (
          (await db.application.count({
            where: {
              accountId: actor.accountId,
              offering: { intake: offering.intake },
              state: { not: 'Discarded' },
              id: { not: id },
            },
          })) >= policy.maxActivePerIntake
        )
          this.fail(
            'APPLICATION_LIMIT',
            'The configured active application limit was reached.',
          );
        await db.applicationDocument.updateMany({
          where: { applicationId: id, status: { not: 'Withdrawn' } },
          data: { status: 'Withdrawn' },
        });
        const updated = await db.application.update({
          where: { id },
          data: {
            offeringId: offering.id,
            requirementVersion: this.fingerprint(offering),
            policyVersion: policy.version,
            qualifications: {},
            state: 'InProgress',
            version: { increment: 1 },
          },
          include,
        });
        await this.audit(
          db,
          actor,
          'ApplicationProgrammeOfferingChanged',
          id,
          dto.idempotencyKey,
          'ALLOW',
          { from: row.offeringId, to: offering.id, impactConfirmed: true },
        );
        return { body: await this.view(db, actor, updated) };
      },
    );
  }
  async discard(actor: ActiveAuthority, id: string, dto: ConfirmDto) {
    return this.command(
      actor,
      dto.idempotencyKey,
      'DiscardApplicationDraft',
      { id, ...dto },
      async (db) => {
        const row = await this.own(db, actor, id);
        if (!dto.confirmed)
          this.fail('CONFIRM', 'Confirm discard before continuing.', 400);
        if (
          row.version !== dto.version ||
          ['Submitted', 'Discarded'].includes(row.state)
        )
          this.fail('LOCKED', 'This version cannot be discarded.');
        const updated = await db.application.update({
          where: { id },
          data: { state: 'Discarded', version: { increment: 1 } },
          include,
        });
        await this.audit(
          db,
          actor,
          'ApplicationDraftDiscarded',
          id,
          dto.idempotencyKey,
          'ALLOW',
          {
            retention:
              'Retained under configured record policy; hidden from normal navigation',
            payment: 'NOT_REQUIRED',
          },
        );
        return { body: await this.view(db, actor, updated) };
      },
    );
  }
  async upload(
    actor: ActiveAuthority,
    id: string,
    dto: DocumentDto,
    file:
      | { buffer: Buffer; originalname: string; size: number; mimetype: string }
      | undefined,
  ) {
    if (!file || file.size > policy.upload.maxBytes)
      this.fail(
        'FILE_SIZE',
        'Choose a file within the displayed size limit.',
        400,
      );
    const mime = actualMime(file.buffer);
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const expected =
      mime === 'application/pdf'
        ? ['pdf']
        : mime === 'image/png'
          ? ['png']
          : ['jpg', 'jpeg'];
    if (!mime || mime !== file.mimetype || !ext || !expected.includes(ext))
      this.fail(
        'UNSAFE_FILE',
        'Upload a supported PDF, JPG or PNG that is not encrypted or active content.',
        400,
      );
    return this.command(
      actor,
      dto.idempotencyKey,
      'UploadSupportingDocument',
      { id, ...dto, hash: digest(file.buffer.toString('base64')) },
      async (db) => {
        const row = await this.own(db, actor, id);
        this.editable(row, dto.version);
        if (
          !this.requiredDocuments(row).some((r) => r.category === dto.category)
        )
          this.fail(
            'CATEGORY',
            'This document category is not required for this application.',
            400,
          );
        const current = row.documents
          .filter(
            (d) => d.category === dto.category && d.status !== 'Withdrawn',
          )
          .at(-1);
        if (
          current?.id !== dto.replacesId ||
          (dto.replacesId && !dto.replacementReason?.trim())
        )
          this.fail(
            'REPLACEMENT',
            'Select the latest document and explain why it is being replaced.',
          );
        if (current)
          await db.applicationDocument.update({
            where: { id: current.id },
            data: { status: 'Withdrawn' },
          });
        await db.applicationDocument.create({
          data: {
            applicationId: id,
            category: dto.category,
            fileName: file.originalname
              .replace(/[^\p{L}\p{N}_. -]/gu, '_')
              .slice(-120),
            mimeType: mime,
            size: file.size,
            content: new Uint8Array(file.buffer),
            sha256: createHash('sha256').update(file.buffer).digest('hex'),
            version: (current?.version ?? 0) + 1,
            replacesId: current?.id,
            replacementReason: dto.replacementReason,
          },
        });
        const updated = await db.application.update({
          where: { id },
          data: { version: { increment: 1 }, state: 'InProgress' },
          include,
        });
        await this.audit(
          db,
          actor,
          'ApplicationDocumentUploaded',
          id,
          dto.idempotencyKey,
          'ALLOW',
          {
            category: dto.category,
            quarantined: true,
            replacesId: current?.id ?? null,
          },
        );
        return { body: await this.view(db, actor, updated) };
      },
    );
  }
  async scan(
    actor: ActiveAuthority,
    id: string,
    docId: string,
    dto: VersionDto,
  ) {
    await this.actor(this.prisma, actor);
    const row = await this.own(this.prisma, actor, id);
    const doc = row.documents.find((d) => d.id === docId);
    if (!doc) this.fail('NOT_FOUND', 'Document not found.', 404);
    const result =
      doc.status === 'SecurityScanPending'
        ? await this.scanner.scan(doc.content)
        : null;
    return this.command(
      actor,
      dto.idempotencyKey,
      'ScanApplicationDocument',
      { id, docId, ...dto },
      async (db) => {
        const current = await this.own(db, actor, id);
        this.editable(current, dto.version);
        const document = current.documents.find((d) => d.id === docId);
        if (!document || document.status !== 'SecurityScanPending')
          this.fail(
            'SCAN_STATE',
            'This file no longer needs a safety check. Reload the latest document status.',
          );
        await db.applicationDocument.update({
          where: { id: docId },
          data: result ?? { status: 'SecurityScanPending' },
        });
        const updated = await db.application.update({
          where: { id },
          data: { version: { increment: 1 } },
          include,
        });
        await this.audit(
          db,
          actor,
          'ApplicationDocumentScanned',
          id,
          dto.idempotencyKey,
          'ALLOW',
          {
            documentId: docId,
            status: result?.status ?? 'SecurityScanPending',
            scanner: result?.scanner,
          },
        );
        return { body: await this.view(db, actor, updated) };
      },
    );
  }
  async content(actor: ActiveAuthority, id: string, docId: string) {
    await this.actor(this.prisma, actor);
    const row = await this.own(this.prisma, actor, id);
    const doc = row.documents.find((d) => d.id === docId);
    if (
      !doc ||
      doc.status !== 'AwaitingQualityCheck' ||
      row.state === 'Discarded'
    )
      this.fail('NOT_FOUND', 'Document is unavailable for viewing.', 404);
    await this.audit(
      this.prisma,
      actor,
      'ApplicationDocumentViewed',
      id,
      randomUUID(),
      'ALLOW',
      { documentId: doc.id },
    );
    return doc;
  }
  async review(actor: ActiveAuthority, id: string) {
    const application = await this.get(actor, id);
    return {
      application,
      policy: this.policy(),
      ready: application.editable && !application.blockers.length,
      blockers: application.blockers,
    };
  }
  async submit(actor: ActiveAuthority, id: string, dto: SubmitDto) {
    return this.command(
      actor,
      dto.idempotencyKey,
      'SubmitApplication',
      { id, ...dto },
      async (db) => {
        const row = await this.own(db, actor, id);
        if (row.submission) {
          await this.audit(
            db,
            actor,
            'ApplicationSubmissionDuplicatePrevented',
            id,
            dto.idempotencyKey,
          );
          return { body: row.submission.receipt };
        }
        this.editable(row, dto.version);
        if (!dto.confirmed)
          this.fail(
            'CONFIRM',
            'Review your application and explicitly confirm submission.',
            400,
          );
        if (
          dto.declarations.length !== policy.declarations.length ||
          new Set(dto.declarations.map((d) => d.id)).size !==
            policy.declarations.length ||
          !policy.declarations.every((d) =>
            dto.declarations.some(
              (a) => a.id === d.id && a.version === d.version && a.accepted,
            ),
          )
        )
          this.fail(
            'DECLARATIONS',
            'Read and accept each current declaration before submitting.',
          );
        const view = await this.view(db, actor, row);
        if (view.blockers.length)
          this.fail(
            'NOT_READY',
            'Your application is not ready to submit. Review the highlighted requirements.',
            422,
            {
              fieldErrors: Object.fromEntries(
                view.blockers.map((b, i) => [
                  `${b.section}.${b.field ?? i}`,
                  b.message,
                ]),
              ),
            },
          );
        const idSnapshot = randomUUID(),
          reference = `APP-${randomUUID()}`,
          now = new Date().toISOString();
        const receipt: SubmissionReceipt = {
          applicationId: id,
          reference,
          submittedAt: now,
          snapshotId: idSnapshot,
          version: row.version,
          institution: 'SIS–Moodle demonstration institution',
          applicantName: `${view.personal.givenName} ${view.personal.familyName}`,
          offering: view.offering,
          status: 'Submitted',
          policyVersion: policy.version,
          paymentStatus: policy.fee.status,
          documents: view.documents
            .filter((d) => d.status !== 'Withdrawn')
            .map((d) => ({
              category: d.category,
              status: d.status,
              version: d.version,
            })),
          verificationReference: randomUUID(),
          help: policy.help,
          nextStep:
            'Await admissions assessment. Documents still require formal verification; this receipt is not an admission offer.',
          declarations: policy.declarations.map((d) => ({
            id: d.id,
            version: d.version,
            acceptedAt: now,
          })),
        };
        await db.applicationSubmission.create({
          data: {
            id: idSnapshot,
            applicationId: id,
            reference,
            snapshot: json({
              application: view,
              policy: this.policy(),
              declarations: receipt.declarations,
            }),
            receipt: json(receipt),
          },
        });
        await db.application.update({
          where: { id },
          data: { state: 'Submitted', reference, version: { increment: 1 } },
        });
        for (const declaration of receipt.declarations)
          await this.audit(
            db,
            actor,
            'ApplicationDeclarationAccepted',
            id,
            dto.idempotencyKey,
            'ALLOW',
            declaration,
          );
        await this.audit(
          db,
          actor,
          'ApplicationSubmitted',
          id,
          dto.idempotencyKey,
          'ALLOW',
          { snapshotId: idSnapshot, version: row.version, receipt: reference },
        );
        await db.outboxEvent.create({
          data: {
            aggregate: 'Application',
            aggregateId: id,
            type: 'ApplicationSubmitted',
            payload: json({
              applicationId: id,
              snapshotId: idSnapshot,
              receiptReference: reference,
              notice:
                'You have an application update. Sign in to view it securely.',
            }),
          },
        });
        return { body: receipt };
      },
    );
  }
  async receipt(actor: ActiveAuthority, id: string) {
    await this.actor(this.prisma, actor);
    const row = await this.own(this.prisma, actor, id);
    if (!row.submission)
      this.fail(
        'NOT_SUBMITTED',
        'No submission receipt exists yet. The application remains a draft.',
        404,
      );
    return row.submission.receipt;
  }
  async result(actor: ActiveAuthority, key: string) {
    await this.actor(this.prisma, actor);
    const row = await this.prisma.applicationCommand.findFirst({
      where: { key, accountId: actor.accountId },
    });
    return row
      ? { status: 'COMPLETED', httpStatus: row.status, response: row.response }
      : { status: 'NOT_FOUND' };
  }
}
