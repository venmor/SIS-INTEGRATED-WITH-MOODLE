import { describe, expect, it, vi } from 'vitest';
import { ensureSimShell } from './moodle-simulator.js';

describe('ensureSimShell', () => {
  it('normalizes a legacy shell for the same offering and period to the canonical ref', async () => {
    const legacy = {
      id: 'shell-1',
      shellRef: 'SWE-2026S1-DEMO',
      offeringId: 'offering-1',
      periodId: 'period-1',
      status: 'ACTIVE',
    };
    const canonical = { ...legacy, shellRef: 'SIM-SH-SWE-2026S1' };
    const db = {
      simShell: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(legacy),
        update: vi.fn().mockResolvedValue(canonical),
        create: vi.fn(),
      },
    };

    await expect(
      ensureSimShell(db as never, {
        shellRef: 'SIM-SH-SWE-2026S1',
        offeringId: 'offering-1',
        periodId: 'period-1',
      }),
    ).resolves.toEqual({ id: 'shell-1', created: false });

    expect(db.simShell.update).toHaveBeenCalledWith({
      where: { id: 'shell-1' },
      data: { shellRef: 'SIM-SH-SWE-2026S1' },
    });
    expect(db.simShell.create).not.toHaveBeenCalled();
  });
});
