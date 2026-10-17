import { randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
  MoodleLiveTestRun,
  MoodleRunAuthenticationReceipt,
} from '@prisma/client';
import type {
  MoodleLiveRunView,
  MoodleLiveRunAction,
  MoodleLiveRunState,
  MoodleManifestEntity,
} from '@sis/contracts/moodle-live-run';
import { SECURITY_V1 } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import { hashToken } from '../identity-access/session.service.js';
import { LiveMoodleAdapter } from './moodle-live.js';
import { configFingerprint, selectBackend } from './moodle-live-config.js';
import {
  checksum,
  databaseFingerprint,
  manifestChecksum,
  parseNonSecretDatabaseIdentity,
  preparationSelection,
} from './moodle-scope.js';
import { verify } from 'argon2';
import { RateLimiter } from '../identity-access/rate-limit.js';

const POLICY = 'MOODLE-LIVE-TEST-v1';
const FRESH_MS = SECURITY_V1.stepUpExpiryMinutes * 60 * 1000;
const ACTIONS: MoodleLiveRunAction[] = [
  'add-entry',
  'seal',
  'technical-approval',
  'start',
  'pause',
  'resume',
  'fail',
  'complete',
  'close-technical',
  'close',
];
type Tx = Prisma.TransactionClient;
export interface MoodleRunActor {
  accountId: string;
  assignmentId: string | null;
  activeRole: string | null;
  scopeType: string | null;
  scopeRef: string | null;
  sessionToken: string;
}
interface Command {
  idempotencyKey: string;
  version: number;
  reason: string;
  receiptToken?: string;
  entity?: MoodleManifestEntity;
  entityId?: string;
  credentialRetiredConfirmed?: boolean;
  evidenceFrozenConfirmed?: boolean;
  humanReviewConfirmed?: boolean;
}
interface Prepare {
  idempotencyKey: string;
  reason: string;
  nonProductionConfirmed: boolean;
  syntheticOnlyConfirmed: boolean;
}
interface ReceiptInput {
  action: MoodleLiveRunAction;
  version: number;
  evidenceChecksum: string;
  password: string;
}
const technical = (action: MoodleLiveRunAction) =>
  ['add-entry', 'seal', 'technical-approval', 'close-technical'].includes(
    action,
  );
const capability = (action: MoodleLiveRunAction) =>
  ['technical-approval', 'close-technical'].includes(action)
    ? 'sync-moodle'
    : technical(action)
      ? 'manage-mapping'
      : 'replay-event';

export function transitionTarget(
  state: string,
  action: string,
): MoodleLiveRunState {
  const transitions: Record<string, Record<string, string>> = {
    PREPARED: {
      'add-entry': 'PREPARED',
      seal: 'PREPARED',
      'technical-approval': 'PREPARED',
      start: 'RUNNING',
      fail: 'FAILED',
    },
    RUNNING: { pause: 'PAUSED', fail: 'FAILED', complete: 'COMPLETED' },
    PAUSED: {
      'technical-approval': 'PAUSED',
      resume: 'RUNNING',
      fail: 'FAILED',
    },
    COMPLETED: { 'close-technical': 'COMPLETED', close: 'CLOSED' },
    FAILED: { 'close-technical': 'FAILED', close: 'CLOSED' },
    CLOSED: {},
  };
  const next = transitions[state]?.[action];
  if (!next) throw new ConflictException('RUN_TRANSITION_INVALID');
  return next as MoodleLiveRunState;
}
export function runActionEvidence(
  run: Pick<
    MoodleLiveTestRun,
    | 'id'
    | 'state'
    | 'version'
    | 'dbFingerprint'
    | 'scopeManifestChecksum'
    | 'configFingerprint'
  >,
  action: string,
): string {
  return checksum(
    JSON.stringify([
      POLICY,
      run.id,
      run.state,
      run.version,
      run.dbFingerprint,
      run.scopeManifestChecksum,
      run.configFingerprint,
      action,
    ]),
  );
}

/** Production port performs only the existing read-only identity preflight. */
@Injectable()
export class MoodleRunIdentityPort {
  constructor(private readonly prisma: PrismaService) {}
  check() {
    return new LiveMoodleAdapter(this.prisma).validateConnection();
  }
}

@Injectable()
export class MoodleLiveRunService {
  private readonly passwordLimiter = new RateLimiter();
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: MoodleRunIdentityPort,
  ) {}

  private async liveActor(
    tx: Tx,
    actor: MoodleRunActor,
    action?: MoodleLiveRunAction,
  ) {
    // Keep revocation/workspace/account changes ordered with the decision.
    // These short shared locks end before the external identity preflight.
    await tx.$queryRaw`SELECT s.id FROM "Session" s JOIN "Account" a ON a.id=s."accountId" JOIN "RoleAssignment" r ON r.id=s."activeAssignmentId" WHERE s."tokenHash"=${hashToken(actor.sessionToken)} FOR SHARE OF s,a,r`;
    const session = await tx.session.findUnique({
      where: { tokenHash: hashToken(actor.sessionToken) },
      include: { account: true, activeAssignment: true },
    });
    const now = Date.now();
    const a = session?.activeAssignment;
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      now - session.lastSeenAt.getTime() >
        SECURITY_V1.session.idleSeconds * 1000 ||
      session.account.status !== 'ACTIVE' ||
      (session.account.lockedUntil &&
        session.account.lockedUntil.getTime() > now) ||
      session.accountId !== actor.accountId ||
      !a ||
      a.id !== actor.assignmentId ||
      a.accountId !== actor.accountId ||
      a.revokedAt ||
      a.scopeType === 'BREAK_GLASS' ||
      a.startsAt.getTime() > now ||
      (a.endsAt && a.endsAt.getTime() <= now) ||
      actor.activeRole !== a.role ||
      actor.scopeType !== a.scopeType ||
      actor.scopeRef !== a.scopeRef ||
      !['MOODLE_ADMIN', 'INTEGRATION_SUPPORT'].includes(a.role)
    )
      throw new ForbiddenException('MOODLE_RUN_AUTHORITY_REQUIRED');
    const needed = action
      ? capability(action)
      : a.role === 'MOODLE_ADMIN'
        ? a.capabilities.includes('manage-mapping')
          ? 'manage-mapping'
          : 'sync-moodle'
        : 'replay-event';
    if (
      (action &&
        a.role !==
          (technical(action) ? 'MOODLE_ADMIN' : 'INTEGRATION_SUPPORT')) ||
      !a.capabilities.includes(needed)
    )
      throw new ForbiddenException('MOODLE_RUN_AUTHORITY_REQUIRED');
    return { session, assignment: a, account: session.account };
  }
  private async scoped(
    tx: Tx,
    actor: MoodleRunActor,
    id: string,
    action?: MoodleLiveRunAction,
  ) {
    const authority = await this.liveActor(tx, actor, action);
    const run = await tx.moodleLiveTestRun.findUnique({ where: { id } });
    if (
      !run ||
      run.scopeType !== authority.assignment.scopeType ||
      run.scopeRef !== authority.assignment.scopeRef
    )
      throw new NotFoundException('MOODLE_RUN_NOT_FOUND');
    return { run, ...authority };
  }
  private async audit(
    tx: Tx,
    actor: MoodleRunActor,
    command: string,
    target: string,
    outcome: string,
    reason: string,
    extra: Prisma.InputJsonObject = {},
  ) {
    await tx.auditEvent.create({
      data: {
        action: `MoodleLiveRun:${command}`,
        outcome,
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: `${actor.scopeType}:${actor.scopeRef}`,
        targetRef: target,
        reason,
        policyVersion: POLICY,
        correlationId: randomUUID(),
        metadata: extra,
      },
    });
  }
  private async guarded<T>(
    actor: MoodleRunActor,
    action: string,
    target: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // Fixed codes only: never copy arbitrary errors, commands or credentials.
      await this.audit(
        this.prisma,
        actor,
        action,
        target,
        'DENY',
        'MOODLE_RUN_COMMAND_REFUSED',
      ).catch(() => undefined);
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        ['P2002', 'P2034'].includes(String(error.code))
      )
        throw new ConflictException('MOODLE_RUN_CONCURRENT_CHANGE');
      throw error;
    }
  }
  private async databaseBinding(tx: Tx) {
    const configured = parseNonSecretDatabaseIdentity(
      process.env.DATABASE_URL ?? '',
    );
    const [actual] = await tx.$queryRaw<
      Array<{ database: string; host: string; port: number }>
    >`SELECT current_database() AS database, host(inet_server_addr()) AS host, inet_server_port() AS port`;
    if (
      !actual ||
      actual.database !== configured.database ||
      !actual.host ||
      !actual.port
    )
      throw new ConflictException('DATABASE_IDENTITY_MISMATCH');
    const rows = await tx.$queryRaw<
      Array<{ migration_name: string; checksum: string }>
    >`SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
    if (
      !rows.length ||
      !rows.some(
        (row) =>
          row.migration_name === '20261016200500_moodle_live_run_foundation',
      )
    )
      throw new ConflictException('DATABASE_MIGRATIONS_REQUIRED');
    const schemaChecksum = checksum(JSON.stringify(rows));
    return {
      schemaChecksum,
      dbFingerprint: databaseFingerprint(actual, schemaChecksum),
    };
  }
  private async replay(
    tx: Tx,
    actor: MoodleRunActor,
    key: string,
    action: string,
  ) {
    const row = await tx.idempotencyKey.findUnique({ where: { key } });
    if (!row) return null;
    if (row.accountId !== actor.accountId || row.action !== action)
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    return row.response as unknown as MoodleLiveRunView;
  }
  private async remember(
    tx: Tx,
    actor: MoodleRunActor,
    key: string,
    action: string,
    result: MoodleLiveRunView,
  ) {
    await tx.idempotencyKey.create({
      data: {
        key,
        accountId: actor.accountId,
        action,
        status: 200,
        response: result as unknown as Prisma.InputJsonObject,
      },
    });
    return result;
  }
  async prepare(actor: MoodleRunActor, input: Prepare) {
    return this.guarded(actor, 'prepare', 'new', () =>
      this.prisma.$transaction(
        async (tx) => {
          const preparer = await this.liveActor(tx, actor, 'seal');
          if (!preparer.assignment.capabilities.includes('sync-moodle'))
            throw new ForbiddenException('MOODLE_RUN_AUTHORITY_REQUIRED');
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey},0))`;
          const action = `moodle-run:prepare:${checksum(JSON.stringify(input))}`;
          const replay = await this.replay(
            tx,
            actor,
            input.idempotencyKey,
            action,
          );
          if (replay) {
            await this.scoped(tx, actor, replay.id, 'seal');
            return replay;
          }
          if (!input.nonProductionConfirmed || !input.syntheticOnlyConfirmed)
            throw new ConflictException(
              'SYNTHETIC_NON_PRODUCTION_DECLARATION_REQUIRED',
            );
          const selection = preparationSelection();
          if (selection.kind !== 'live-test')
            throw new ConflictException('LIVE_TARGET_CONFIGURATION_REQUIRED');
          const binding = await this.databaseBinding(tx);
          const id = randomUUID();
          const runId = `SIS-MOODLE-LIVE-TEST-${id}`;
          const d = selection.descriptor;
          const run = await tx.moodleLiveTestRun.create({
            data: {
              id,
              runId,
              scopeType: actor.scopeType!,
              scopeRef: actor.scopeRef!,
              ...binding,
              scopeManifestChecksum: manifestChecksum([]),
              configFingerprint: configFingerprint({
                ...d,
                runId,
                dbFingerprint: binding.dbFingerprint,
              }),
              expectedHost: d.host,
              expectedSiteId: d.siteId,
              expectedRelease: d.release,
              cohortPrefix: d.cohortPrefix,
              nonProductionConfirmed: true,
              syntheticOnlyConfirmed: true,
              creatorAccountId: actor.accountId,
            },
          });
          await tx.moodleScopeManifest.create({
            data: { runId: id, checksum: manifestChecksum([]) },
          });
          await this.decision(
            tx,
            actor,
            run,
            'prepare',
            'PREPARED',
            input.reason,
            null,
          );
          return this.remember(
            tx,
            actor,
            input.idempotencyKey,
            action,
            await this.view(tx, actor, id),
          );
        },
        { timeout: 15000 },
      ),
    );
  }
  private async decision(
    tx: Tx,
    actor: MoodleRunActor,
    run: MoodleLiveTestRun,
    action: string,
    toState: string,
    reason: string,
    receipt: MoodleRunAuthenticationReceipt | null,
    declarations: Prisma.InputJsonObject = {},
  ) {
    await tx.moodleLiveTestRunTransition.create({
      data: {
        runId: run.id,
        command: action,
        fromState: run.state,
        toState,
        actorAccountId: actor.accountId,
        actorRole: actor.activeRole!,
        actorCapability:
          action === 'prepare'
            ? 'manage-mapping'
            : capability(action as MoodleLiveRunAction),
        actorScopeType: actor.scopeType!,
        actorScopeRef: actor.scopeRef!,
        reason,
        freshAuthRef: receipt?.id,
        evidenceChecksum: runActionEvidence(run, action),
      },
    });
    await this.audit(tx, actor, action, run.id, 'ALLOW', reason, {
      fromState: run.state,
      toState,
      version: run.version,
      evidenceChecksum: runActionEvidence(run, action),
      ...declarations,
    });
  }
  async issueReceipt(actor: MoodleRunActor, id: string, input: ReceiptInput) {
    return this.guarded(actor, 'reauthenticate', id, () =>
      this.prisma.$transaction(
        async (tx) => {
          const { run, session, account } = await this.scoped(
            tx,
            actor,
            id,
            input.action,
          );
          transitionTarget(run.state, input.action);
          if (
            run.version !== input.version ||
            runActionEvidence(run, input.action) !== input.evidenceChecksum
          )
            throw new ConflictException('RUN_EVIDENCE_STALE');
          if (
            ![
              'technical-approval',
              'start',
              'resume',
              'close-technical',
              'close',
            ].includes(input.action)
          )
            throw new ConflictException('FRESH_AUTH_ACTION_INVALID');
          const limit = RateLimiter.stepUpLimit();
          if (
            !this.passwordLimiter.check(
              `${actor.accountId}:${input.action}`,
              limit.maxAttempts,
              limit.windowMinutes,
            ).allowed
          )
            throw new HttpException('CURRENT_PASSWORD_RATE_LIMITED', 429);
          const credential = await tx.credential.findFirst({
            where: {
              accountId: actor.accountId,
              kind: 'PASSWORD',
              status: 'ACTIVE',
            },
          });
          if (
            !credential ||
            !(await verify(credential.secretHash, input.password).catch(
              () => false,
            ))
          )
            throw new ForbiddenException('CURRENT_PASSWORD_REQUIRED');
          const receiptToken = randomBytes(32).toString('base64url');
          const expiresAt = new Date(Date.now() + FRESH_MS);
          const row = await tx.moodleRunAuthenticationReceipt.create({
            data: {
              tokenHash: hashToken(receiptToken),
              accountId: account.id,
              personId: account.personId,
              sessionId: session.id,
              assignmentId: actor.assignmentId!,
              runId: id,
              action: input.action,
              version: input.version,
              evidenceChecksum: input.evidenceChecksum,
              expiresAt,
            },
          });
          await this.audit(
            tx,
            actor,
            'reauthenticate',
            id,
            'ALLOW',
            'SYNTHETIC_CURRENT_PASSWORD_VERIFIED',
            {
              receiptId: row.id,
              action: input.action,
              evidenceChecksum: input.evidenceChecksum,
            },
          );
          return {
            receiptToken,
            expiresAt: expiresAt.toISOString(),
            authenticationKind: 'SYNTHETIC_CURRENT_PASSWORD' as const,
          };
        },
        { timeout: 15000 },
      ),
    );
  }
  private async consume(
    tx: Tx,
    actor: MoodleRunActor,
    run: MoodleLiveTestRun,
    action: MoodleLiveRunAction,
    token?: string,
    consume = true,
  ) {
    const row = token
      ? await tx.moodleRunAuthenticationReceipt.findUnique({
          where: { tokenHash: hashToken(token) },
        })
      : null;
    const { session } = await this.liveActor(tx, actor, action);
    if (
      !row ||
      row.usedAt ||
      row.expiresAt.getTime() <= Date.now() ||
      row.accountId !== actor.accountId ||
      row.sessionId !== session.id ||
      row.assignmentId !== actor.assignmentId ||
      row.runId !== run.id ||
      row.action !== action ||
      row.version !== run.version ||
      row.evidenceChecksum !== runActionEvidence(run, action)
    )
      throw new ConflictException('FRESH_AUTH_RECEIPT_REQUIRED');
    if (!consume) return row;
    const changed = await tx.moodleRunAuthenticationReceipt.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (changed.count !== 1)
      throw new ConflictException('FRESH_AUTH_RECEIPT_USED');
    return row;
  }
  private async independentApproval(
    tx: Tx,
    actor: MoodleRunActor,
    run: MoodleLiveTestRun,
    receiptId: string | null,
    action: string,
    requireFresh = true,
  ) {
    const proof = receiptId
      ? await tx.moodleRunAuthenticationReceipt.findUnique({
          where: { id: receiptId },
        })
      : null;
    if (proof)
      await tx.$queryRaw`SELECT s.id FROM "Session" s JOIN "Account" a ON a.id=s."accountId" JOIN "RoleAssignment" r ON r.id=s."activeAssignmentId" WHERE s.id=${proof.sessionId} FOR SHARE OF s,a,r`;
    const original = proof
      ? await tx.session.findUnique({
          where: { id: proof.sessionId },
          include: { account: true, activeAssignment: true },
        })
      : null;
    const operator = await tx.account.findUnique({
      where: { id: actor.accountId },
    });
    const decision = proof
      ? await tx.moodleLiveTestRunTransition.findFirst({
          where: {
            runId: run.id,
            command: action,
            freshAuthRef: proof.id,
            actorAccountId: proof.accountId,
            evidenceChecksum: proof.evidenceChecksum,
          },
        })
      : null;
    const a = original?.activeAssignment;
    const now = Date.now();
    if (
      !proof ||
      !proof.usedAt ||
      proof.action !== action ||
      proof.runId !== run.id ||
      (requireFresh && proof.expiresAt.getTime() <= now) ||
      !decision ||
      !original ||
      original.revokedAt ||
      original.expiresAt.getTime() <= now ||
      now - original.lastSeenAt.getTime() >
        SECURITY_V1.session.idleSeconds * 1000 ||
      original.accountId !== proof.accountId ||
      original.account.status !== 'ACTIVE' ||
      (original.account.lockedUntil &&
        original.account.lockedUntil.getTime() > now) ||
      !a ||
      a.id !== proof.assignmentId ||
      a.accountId !== proof.accountId ||
      a.revokedAt ||
      a.startsAt.getTime() > now ||
      (a.endsAt && a.endsAt.getTime() <= now) ||
      a.role !== 'MOODLE_ADMIN' ||
      !a.capabilities.includes('sync-moodle') ||
      a.scopeType !== run.scopeType ||
      a.scopeRef !== run.scopeRef ||
      !operator ||
      proof.accountId === actor.accountId ||
      proof.personId === operator.personId ||
      original.account.personId !== proof.personId
    )
      throw new ConflictException(
        'INDEPENDENT_CURRENT_TECHNICAL_APPROVAL_REQUIRED',
      );
    return proof;
  }
  private async runtimeBinding(tx: Tx, run: MoodleLiveTestRun) {
    const selected = selectBackend();
    if (
      selected.kind !== 'live-test' ||
      selected.descriptor.runId !== run.runId ||
      selected.descriptor.dbFingerprint !== run.dbFingerprint ||
      selected.descriptor.configFingerprint !== run.configFingerprint
    )
      throw new ConflictException('RUN_RUNTIME_BINDING_REQUIRED');
    const actual = await this.databaseBinding(tx);
    if (
      actual.dbFingerprint !== run.dbFingerprint ||
      actual.schemaChecksum !== run.schemaChecksum
    )
      throw new ConflictException('DB_FINGERPRINT_MISMATCH');
    const manifest = await tx.moodleScopeManifest.findUniqueOrThrow({
      where: { runId: run.id },
      include: { entries: true },
    });
    if (
      !manifest.sealedAt ||
      !manifest.entryCount ||
      manifestChecksum(manifest.entries) !== run.scopeManifestChecksum ||
      manifest.checksum !== run.scopeManifestChecksum ||
      manifest.entryCount !== manifest.entries.length
    )
      throw new ConflictException('SEALED_MANIFEST_REQUIRED');
    for (const entry of manifest.entries)
      if (
        !(await this.sourceExists(
          tx,
          entry.entity as MoodleManifestEntity,
          entry.entityId,
        ))
      )
        throw new ConflictException('MANIFEST_SOURCE_NOT_FOUND');
  }
  async command(
    actor: MoodleRunActor,
    id: string,
    action: MoodleLiveRunAction,
    input: Command,
  ) {
    return this.guarded(actor, action, id, async () => {
      // Read-only HTTP preflight has no open database transaction. The locked
      // commit independently revalidates the exact snapshot and live authority.
      let identityProof: {
        evidence: string;
        checkedAt: Date;
        numericVersion: string | null;
      } | null = null;
      if (action === 'start' || action === 'resume') {
        const snapshot = await this.prisma.$transaction(async (tx) => {
          const { run } = await this.scoped(tx, actor, id, action);
          const operation = `moodle-run:${id}:${action}:${checksum(JSON.stringify(input))}`;
          const replay = await this.replay(
            tx,
            actor,
            input.idempotencyKey,
            operation,
          );
          if (replay) return { replay, evidence: '' };
          transitionTarget(run.state, action);
          if (input.version !== run.version)
            throw new ConflictException('RUN_VERSION_STALE');
          await this.consume(tx, actor, run, action, input.receiptToken, false);
          await this.independentApproval(
            tx,
            actor,
            run,
            run.technicalReceiptId,
            'technical-approval',
            action === 'start',
          );
          await this.runtimeBinding(tx, run);
          return { replay: null, evidence: runActionEvidence(run, action) };
        });
        if (snapshot.replay) return snapshot.replay;
        const result = await this.identity.check();
        if (!result.ok)
          throw new ConflictException('MOODLE_TARGET_IDENTITY_REQUIRED');
        identityProof = {
          evidence: snapshot.evidence,
          checkedAt: new Date(),
          numericVersion: result.numericVersion,
        };
      }
      return this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`;
          const { run } = await this.scoped(tx, actor, id, action);
          const operation = `moodle-run:${id}:${action}:${checksum(JSON.stringify(input))}`;
          const replay = await this.replay(
            tx,
            actor,
            input.idempotencyKey,
            operation,
          );
          if (replay) return replay;
          const target = transitionTarget(run.state, action);
          if (input.version !== run.version)
            throw new ConflictException('RUN_VERSION_STALE');
          if (!input.reason?.trim())
            throw new ConflictException('RUN_REASON_REQUIRED');
          let receipt: MoodleRunAuthenticationReceipt | null = null;
          if (
            [
              'technical-approval',
              'start',
              'resume',
              'close-technical',
              'close',
            ].includes(action)
          )
            receipt = await this.consume(
              tx,
              actor,
              run,
              action,
              input.receiptToken,
            );
          const data: Prisma.MoodleLiveTestRunUpdateInput = {
            version: { increment: 1 },
            state: target,
          };
          if (action === 'add-entry') {
            const manifest = await tx.moodleScopeManifest.findUniqueOrThrow({
              where: { runId: id },
            });
            if (manifest.sealedAt)
              throw new ConflictException('MANIFEST_SEALED');
            if (
              !input.entity ||
              !input.entityId ||
              !(await this.sourceExists(tx, input.entity, input.entityId))
            )
              throw new ConflictException('MANIFEST_SOURCE_NOT_FOUND');
            await tx.moodleScopeManifestEntry.create({
              data: {
                manifestId: manifest.id,
                entity: input.entity,
                entityId: input.entityId,
                cohortPrefix: run.cohortPrefix,
                addedByAccountId: actor.accountId,
              },
            });
            const entries = await tx.moodleScopeManifestEntry.findMany({
              where: { manifestId: manifest.id },
            });
            const digest = manifestChecksum(entries);
            await tx.moodleScopeManifest.update({
              where: { id: manifest.id },
              data: { entryCount: entries.length, checksum: digest },
            });
            data.scopeManifestChecksum = digest;
          }
          if (action === 'seal') {
            const manifest = await tx.moodleScopeManifest.findUniqueOrThrow({
              where: { runId: id },
              include: { entries: true },
            });
            if (manifest.sealedAt || !manifest.entries.length)
              throw new ConflictException('MANIFEST_NOT_SEALABLE');
            await tx.moodleScopeManifest.update({
              where: { id: manifest.id },
              data: { sealedAt: new Date() },
            });
          }
          if (action === 'technical-approval') {
            const manifest = await tx.moodleScopeManifest.findUniqueOrThrow({
              where: { runId: id },
            });
            if (!manifest.sealedAt)
              throw new ConflictException('SEALED_MANIFEST_REQUIRED');
            data.technicalApproverAccountId = actor.accountId;
            data.technicalReceiptId = receipt!.id;
          }
          if (action === 'start' || action === 'resume') {
            await this.independentApproval(
              tx,
              actor,
              run,
              run.technicalReceiptId,
              'technical-approval',
              action === 'start',
            );
            await this.runtimeBinding(tx, run);
            if (
              !identityProof ||
              identityProof.evidence !== runActionEvidence(run, action) ||
              Date.now() - identityProof.checkedAt.getTime() > FRESH_MS
            )
              throw new ConflictException('RUN_IDENTITY_EVIDENCE_STALE');
            data.operationalApproverAccountId = actor.accountId;
            data.identityStatus = 'VERIFIED';
            data.actualNumericVersion = identityProof.numericVersion;
            data.identityCheckedAt = identityProof.checkedAt;
            if (action === 'start') data.startedAt = new Date();
          }
          if (action === 'fail') data.endedAt = new Date();
          if (action === 'complete')
            throw new ConflictException('FULL_REHEARSAL_EVIDENCE_REQUIRED');
          if (action === 'close-technical') {
            if (!input.credentialRetiredConfirmed)
              throw new ConflictException('CREDENTIAL_RETIREMENT_REQUIRED');
            data.retirementReceiptId = receipt!.id;
          }
          if (action === 'close') {
            if (!input.evidenceFrozenConfirmed || !input.humanReviewConfirmed)
              throw new ConflictException(
                'FROZEN_EVIDENCE_AND_HUMAN_REVIEW_REQUIRED',
              );
            await this.independentApproval(
              tx,
              actor,
              run,
              run.retirementReceiptId,
              'close-technical',
            );
          }
          await tx.moodleLiveTestRun.update({
            where: { id, version: run.version },
            data,
          });
          await this.decision(
            tx,
            actor,
            run,
            action,
            target,
            input.reason,
            receipt,
            {
              credentialRetiredDeclared:
                input.credentialRetiredConfirmed === true,
              evidenceFrozenDeclared: input.evidenceFrozenConfirmed === true,
              humanReviewDeclared: input.humanReviewConfirmed === true,
            },
          );
          return this.remember(
            tx,
            actor,
            input.idempotencyKey,
            operation,
            await this.view(tx, actor, id),
          );
        },
        { timeout: 20000 },
      );
    });
  }
  private async sourceExists(
    tx: Tx,
    entity: MoodleManifestEntity,
    id: string,
  ): Promise<boolean> {
    switch (entity) {
      case 'Account':
        return !!(await tx.account.findUnique({
          where: { id },
          select: { id: true },
        }));
      case 'Student':
        return !!(await tx.student.findUnique({
          where: { id },
          select: { id: true },
        }));
      case 'ProgrammeOffering':
        return !!(await tx.programmeOffering.findUnique({
          where: { id },
          select: { id: true },
        }));
      case 'ProgrammeAttempt':
        return !!(await tx.programmeAttempt.findUnique({
          where: { id },
          select: { id: true },
        }));
      case 'CourseRegistration':
        return !!(await tx.courseRegistration.findUnique({
          where: { id },
          select: { id: true },
        }));
      case 'TutorialGroup':
        return !!(await tx.tutorialGroup.findUnique({
          where: { id },
          select: { id: true },
        }));
      case 'TeachingAssignment':
        return !!(await tx.teachingAssignment.findUnique({
          where: { id },
          select: { id: true },
        }));
      default:
        return false;
    }
  }
  private async view(
    tx: Tx,
    actor: MoodleRunActor,
    id: string,
  ): Promise<MoodleLiveRunView> {
    const run = await tx.moodleLiveTestRun.findUniqueOrThrow({
      where: { id },
      include: {
        manifest: {
          include: {
            entries: { orderBy: [{ entity: 'asc' }, { entityId: 'asc' }] },
          },
        },
        transitions: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      },
    });
    const assignment = await tx.roleAssignment.findUniqueOrThrow({
      where: { id: actor.assignmentId! },
    });
    const permittedActions = ACTIONS.filter((action) => {
      if (!assignment.capabilities.includes(capability(action))) return false;
      if (
        actor.activeRole !==
        (technical(action) ? 'MOODLE_ADMIN' : 'INTEGRATION_SUPPORT')
      )
        return false;
      try {
        transitionTarget(run.state, action);
      } catch {
        return false;
      }
      if (['add-entry', 'seal'].includes(action) && run.manifest?.sealedAt)
        return false;
      return true;
    });
    const date = (value: Date | null) => value?.toISOString() ?? null;
    return {
      id: run.id,
      runId: run.runId,
      state: run.state as MoodleLiveRunState,
      version: run.version,
      policyVersion: run.policyVersion,
      dbFingerprint: run.dbFingerprint,
      schemaChecksum: run.schemaChecksum,
      configFingerprint: run.configFingerprint,
      expectedHost: run.expectedHost,
      expectedSiteId: run.expectedSiteId,
      expectedRelease: run.expectedRelease,
      actualNumericVersion: run.actualNumericVersion,
      cohortPrefix: run.cohortPrefix,
      nonProductionConfirmed: run.nonProductionConfirmed,
      creatorAccountId: run.creatorAccountId,
      technicalApproverAccountId: run.technicalApproverAccountId,
      operationalApproverAccountId: run.operationalApproverAccountId,
      identityStatus: run.identityStatus,
      identityCheckedAt: date(run.identityCheckedAt),
      startedAt: date(run.startedAt),
      endedAt: date(run.endedAt),
      requiredBinding: { runId: run.runId, dbFingerprint: run.dbFingerprint },
      manifest: {
        checksum: run.manifest!.checksum,
        entryCount: run.manifest!.entryCount,
        sealedAt: date(run.manifest!.sealedAt),
        entries: run.manifest!.entries.map((e) => ({
          entity: e.entity as MoodleManifestEntity,
          entityId: e.entityId,
          addedAt: e.addedAt.toISOString(),
        })),
      },
      decisions: run.transitions.map((t) => ({
        id: t.id,
        command: t.command,
        fromState: t.fromState,
        toState: t.toState,
        actorAccountId: t.actorAccountId,
        actorRole: t.actorRole,
        reason: t.reason,
        evidenceChecksum: t.evidenceChecksum,
        freshAuthRef: t.freshAuthRef,
        createdAt: t.createdAt.toISOString(),
      })),
      permittedActions,
      actionEvidence: Object.fromEntries(
        permittedActions.map((a) => [a, runActionEvidence(run, a)]),
      ),
      blockers: [
        'LIVE_MAPPING_AND_DELIVERY_PLANS_REQUIRED',
        'FULL_REHEARSAL_EVIDENCE_REQUIRED',
      ],
      deliveryReadiness: {
        outcome: 'NOT_PROVISIONED',
        detail:
          'Foundation approvals do not deliver Moodle events. Mapping, claim and rehearsal evidence remain required.',
      },
    };
  }
  async detail(actor: MoodleRunActor, id: string) {
    return this.guarded(actor, 'detail', id, () =>
      this.prisma.$transaction(async (tx) => {
        await this.scoped(tx, actor, id);
        return this.view(tx, actor, id);
      }),
    );
  }
  async current(actor: MoodleRunActor) {
    return this.guarded(actor, 'current', 'current', () =>
      this.prisma.$transaction(async (tx) => {
        const { assignment } = await this.liveActor(tx, actor);
        const row = await tx.moodleLiveTestRun.findFirst({
          where: {
            scopeType: assignment.scopeType,
            scopeRef: assignment.scopeRef,
          },
          orderBy: { createdAt: 'desc' },
        });
        return row ? this.view(tx, actor, row.id) : null;
      }),
    );
  }
  async setup(actor: MoodleRunActor) {
    const current = await this.current(actor);
    const selection = preparationSelection();
    return {
      target:
        selection.kind === 'live-test-disabled'
          ? { kind: selection.kind, reasons: selection.reasons }
          : { kind: selection.kind },
      databaseReady: true,
      current,
    };
  }
}
