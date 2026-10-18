import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resultCommandDigest, resultDemoEnabled, ResultReleaseProofService } from './result-release-security.service.js';
afterEach(() => vi.unstubAllEnvs());
describe('purpose bound result release proofs', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('SIS_ENABLE_RESULT_DEMO_POLICY', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://review:review@127.0.0.1/sis_result_review');
  });
  it('keeps production and unpinned cloud closed', () => {
    expect(resultDemoEnabled()).toBe(true);
    vi.stubEnv('DATABASE_URL', 'postgresql://review:review@127.0.0.1/sis_production');
    expect(resultDemoEnabled()).toBe(false);
    vi.stubEnv('DATABASE_URL', 'postgresql://x:x@db.example.com/neondb?sslmode=require');
    expect(resultDemoEnabled()).toBe(false);
  });
  it('binds command digest to exact target, version and declaration', () => {
    const original = resultCommandDigest('one', 3, 'confirmed');
    expect(resultCommandDigest('two', 3, 'confirmed')).not.toBe(original);
    expect(resultCommandDigest('one', 4, 'confirmed')).not.toBe(original);
    expect(resultCommandDigest('one', 3, 'different')).not.toBe(original);
  });
  it('consumes only a matching unexpired proof once and stores only its hash', async () => {
    let used = false;
    const updateMany = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.sessionHash !== 'session-a' || where.action !== 'ReleaseOfficialCourseResults' || where.commandDigest !== 'digest-a' || used) return { count: 0 };
      used = true;
      return { count: 1 };
    });
    const service = new ResultReleaseProofService({} as never);
    const actor = { accountId: 'actor-a', assignmentId: 'assignment-a', activeRole: 'EXAMINATIONS_OFFICER', scope: 'PERIOD:2026S1' };
    const context = { actor, sessionHash: 'session-a', action: 'ReleaseOfficialCourseResults', commandDigest: 'digest-a', proof: 'a'.repeat(43) };
    const db = { resultReleaseProof: { updateMany } };
    expect(await service.consume(db as never, { ...context, sessionHash: 'another-session' })).toBe(false);
    expect(await service.consume(db as never, context)).toBe(true);
    expect(await service.consume(db as never, context)).toBe(false);
    expect(JSON.stringify(updateMany.mock.calls)).not.toContain('a'.repeat(43));
    expect(updateMany.mock.calls[1][0].where).toMatchObject({ consumedAt: null, expiresAt: { gt: expect.any(Date) }, assignmentId: 'assignment-a' });
  });
  it('does not query storage for an absent proof', async () => {
    const updateMany = vi.fn();
    const service = new ResultReleaseProofService({} as never);
    const context = { actor: { accountId: 'a', assignmentId: null, activeRole: null, scope: null }, sessionHash: 's', action: 'ReleaseOfficialCourseResults', commandDigest: 'd' };
    expect(await service.consume({ resultReleaseProof: { updateMany } } as never, context)).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
