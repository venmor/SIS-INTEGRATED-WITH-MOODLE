import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
export type ScanResult = {
  status: 'SecurityScanPending' | 'SecurityScanFailed' | 'AwaitingQualityCheck';
  scanner: string | null;
};
/** Scanner failure is never interpreted as safe. No shell or user-controlled command. */
@Injectable()
export class DocumentScanner {
  async scan(content: Uint8Array): Promise<ScanResult> {
    if (process.env.APPLICATION_SCANNER === 'demo-fixtures') {
      if (process.env.DEMO_MODE !== 'true')
        return { status: 'SecurityScanPending', scanner: null };
      // Byte-for-byte fixture allowlist, not a malware detector or magic-string bypass.
      try {
        if (
          createHash('sha256').update(content).digest('hex') ===
          '20e434e8f633d7dc6e5196ddd2afdb71523d5249677e262573dd632ca4e324e3'
        )
          return {
            status: 'AwaitingQualityCheck',
            scanner: 'DEMO-EXACT-FIXTURE-v1',
          };
      } catch {
        /* unavailable fixture stays quarantined */
      }
      return { status: 'SecurityScanPending', scanner: null };
    }
    return new Promise((resolve) => {
      const child = spawn('clamscan', ['--no-summary', '-'], {
        stdio: ['pipe', 'ignore', 'ignore'],
      });
      const timer = setTimeout(() => child.kill('SIGKILL'), 15000);
      child.on('error', () => {
        clearTimeout(timer);
        resolve({ status: 'SecurityScanPending', scanner: null });
      });
      child.stdin.on('error', () => {});
      child.on('close', (code) => {
        clearTimeout(timer);
        // Antivirus success does not validate PDF dictionaries, encoded names,
        // compressed objects or encryption. Keep arbitrary PDFs quarantined until
        // an approved structural validator is connected. Exact demo bytes above
        // remain a separate, explicit fixture-only adapter.
        const requiresPdfValidation =
          Buffer.from(content).subarray(0, 5).toString() === '%PDF-';
        resolve({
          status:
            code === 0 && !requiresPdfValidation
              ? 'AwaitingQualityCheck'
              : code === 1
                ? 'SecurityScanFailed'
                : 'SecurityScanPending',
          scanner:
            code === 0 && requiresPdfValidation
              ? 'ClamAV; structural PDF validation pending'
              : code === 0 || code === 1
                ? 'ClamAV'
                : null,
        });
      });
      child.stdin.end(content);
    });
  }
}
export function actualMime(b: Buffer): string | null {
  if (
    b.subarray(0, 5).toString() === '%PDF-' &&
    b.subarray(-1024).toString().includes('%%EOF')
  ) {
    // Coarse early rejection only. Arbitrary PDFs still require structural
    // validation in the scanner adapter; this byte pattern is not a PDF parser.
    if (
      /\/(Encrypt|JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)\b/.test(
        b.toString('latin1'),
      )
    )
      return null;
    return 'application/pdf';
  }
  if (
    b.length > 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    b.subarray(-8, -4).toString() === 'IEND'
  )
    return 'image/png';
  if (
    b.length > 4 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[b.length - 2] === 255 &&
    b[b.length - 1] === 217
  )
    return 'image/jpeg';
  return null;
}
