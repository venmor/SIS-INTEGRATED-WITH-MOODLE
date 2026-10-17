import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  transitionTarget,
  runActionEvidence,
} from './moodle-live-run.service.js';

describe('live run transition contract', () => {
  it('allows terminal closure while forbidding terminal restart', () => {
    expect(transitionTarget('FAILED', 'close')).toBe('CLOSED');
    expect(transitionTarget('COMPLETED', 'close')).toBe('CLOSED');
    expect(() => transitionTarget('FAILED', 'start')).toThrow(
      'RUN_TRANSITION_INVALID',
    );
    expect(() => transitionTarget('CLOSED', 'close')).toThrow(
      'RUN_TRANSITION_INVALID',
    );
  });
  it('allows a prepared run to be abandoned without running', () => {
    expect(transitionTarget('PREPARED', 'fail')).toBe('FAILED');
  });
  it('changes authentication evidence when state, version, scope or action changes', () => {
    const run = {
      id: 'id',
      state: 'PREPARED',
      version: 1,
      dbFingerprint: 'db',
      scopeManifestChecksum: 'scope',
      configFingerprint: 'config',
    };
    const initial = runActionEvidence(run, 'start');
    for (const patch of [
      { state: 'PAUSED' },
      { version: 2 },
      { scopeManifestChecksum: 'other' },
      { configFingerprint: 'other' },
    ])
      expect(runActionEvidence({ ...run, ...patch }, 'start')).not.toBe(
        initial,
      );
    expect(runActionEvidence(run, 'technical-approval')).not.toBe(initial);
  });
});
