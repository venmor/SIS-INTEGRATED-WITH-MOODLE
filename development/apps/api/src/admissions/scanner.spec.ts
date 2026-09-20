import { readFile } from 'node:fs/promises';
import { DocumentScanner, actualMime } from './scanner.js';
// Only the external antivirus process is doubled; validation and state decisions are real.
vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');
  return {
    spawn: () => {
      const child = new EventEmitter() as InstanceType<typeof EventEmitter> & {
        stdin: { on: () => void; end: () => void };
        kill: () => void;
      };
      child.stdin = {
        on: () => {},
        end: () => queueMicrotask(() => child.emit('close', 0)),
      };
      child.kill = () => {};
      return child;
    },
  };
});
describe('document scanner boundary', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('accepts only exact demo fixture bytes while demo mode is explicit', async () => {
    const bytes = await readFile(
      '../../packages/test-fixtures/documents/fictional-result.pdf',
    );
    const scanner = new DocumentScanner();
    vi.stubEnv('APPLICATION_SCANNER', 'demo-fixtures');
    vi.stubEnv('DEMO_MODE', 'false');
    expect((await scanner.scan(bytes)).status).toBe('SecurityScanPending');
    vi.stubEnv('DEMO_MODE', 'true');
    expect((await scanner.scan(bytes)).status).toBe('AwaitingQualityCheck');
    expect(
      (await scanner.scan(Buffer.concat([bytes, Buffer.from('modified')])))
        .status,
    ).toBe('SecurityScanPending');
  });
  it('does not treat an antivirus clean exit as structural PDF approval', async () => {
    vi.stubEnv('APPLICATION_SCANNER', 'clamav');
    vi.stubEnv('DEMO_MODE', 'false');
    const pdf = Buffer.from('%PDF-1.4 /Java#53cript (active) %%EOF');
    expect((await new DocumentScanner().scan(pdf)).status).toBe(
      'SecurityScanPending',
    );
  });
  it('rejects executable, encrypted and active-content files before quarantine', () => {
    for (const text of [
      'MZ executable',
      '%PDF-1.4 /Encrypt 1 0 R %%EOF',
      '%PDF-1.4 /JavaScript (alert) %%EOF',
    ])
      expect(actualMime(Buffer.from(text))).toBeNull();
  });
});
