import { Injectable, Inject } from '@nestjs/common';
import NodeClam from 'clamscan';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { PdfSecurityService, ValidationResult } from './pdf-security.service.js';

export type ScanResult = {
  status: 'SecurityScanPending' | 'SecurityScanFailed' | 'AwaitingQualityCheck';
  scanner: string | null;
  correlationId: string;
};

/** Scanner failure is never interpreted as safe. No shell or user-controlled command. */
@Injectable()
export class DocumentScanner {
  private readonly clamscan: NodeClam;
  private initialization: Promise<NodeClam> | undefined;
  private readonly clamavHost: string;
  private readonly clamavPort: number;

  constructor(private readonly pdfSecurity: PdfSecurityService) {
    this.clamavHost = process.env.CLAMAV_HOST ?? 'localhost';
    this.clamavPort = parseInt(process.env.CLAMAV_PORT ?? '3310', 10);

    this.clamscan = new NodeClam();
  }

  private readyScanner(): Promise<NodeClam> {
    // Initialize only for a real scan. Demo and disabled modes must not open a
    // background connection, and an unavailable daemon must remain pending.
    return (this.initialization ??= this.clamscan.init({
      clamdscan: {
        host: this.clamavHost,
        port: this.clamavPort,
        timeout: 15000,
        multiscan: true,
        localFallback: false,
        active: true,
        bypassTest: false,
      },
      clamscan: {
        active: false,
      },
      preference: 'clamdscan',
    }));
  }

  async scan(content: Uint8Array): Promise<ScanResult> {
    const correlationId = randomUUID();

    // Demo fixture allowlist - ONLY when DEMO_MODE=true
    if (process.env.APPLICATION_SCANNER === 'demo-fixtures') {
      if (process.env.DEMO_MODE !== 'true') {
        return { status: 'SecurityScanPending', scanner: null, correlationId };
      }
      // Byte-for-byte fixture allowlist, not a malware detector or magic-string bypass.
      try {
        if (
          createHash('sha256').update(content).digest('hex') ===
          '20e434e8f633d7dc6e5196ddd2afdb71523d5249677e262573dd632ca4e324e3'
        )
          return {
            status: 'AwaitingQualityCheck',
            scanner: 'DEMO-EXACT-FIXTURE-v1',
            correlationId,
          };
      } catch {
        /* unavailable fixture stays quarantined */
      }
      return { status: 'SecurityScanPending', scanner: null, correlationId };
    }

    // Production pipeline: ClamAV + PDF structural validation
    if (process.env.APPLICATION_SCANNER === 'clamav') {
      // 1. ClamAV scan
      const clamavResult = await this.scanWithClamAV(content, correlationId);
      if (clamavResult.status === 'SecurityScanFailed') {
        return clamavResult;
      }
      // ClamAV error/unavailable: scanner is null
      if (clamavResult.status === 'SecurityScanPending' && clamavResult.scanner === null) {
        return clamavResult;
      }
      // Clean ClamAV result: scanner is 'ClamAV', proceed to PDF validation
      // (clamavResult.status === 'SecurityScanPending' && clamavResult.scanner === 'ClamAV')

      // 2. PDF structural validation (only for PDFs)
      if (this.isPdf(content)) {
        const validation = await this.pdfSecurity.validatePdfStructure(content);
        if (!validation.safe) {
          // Log with correlationId for operational monitoring
          console.warn(
            `PDF rejected by structural validation: ${validation.issues.join('; ')}`,
            { correlationId, issues: validation.issues, details: validation.details },
          );
          return {
            status: 'SecurityScanFailed',
            scanner: 'ClamAV; PDF structural validation',
            correlationId,
          };
        }
        // Optional: sanitize PDF (could be used to store clean version)
        // const sanitized = await this.pdfSecurity.sanitizePdf(content);
      }

      return {
        status: 'AwaitingQualityCheck',
        scanner: 'ClamAV; PDF structural validation',
        correlationId,
      };
    }

    return { status: 'SecurityScanPending', scanner: null, correlationId };
  }

  private async scanWithClamAV(content: Uint8Array, correlationId: string): Promise<ScanResult> {
    try {
      const stream = Readable.from(content);
      const scanner = await this.readyScanner();
      const result = await scanner.scanStream(stream);

      if (result.isInfected) {
        console.warn(`ClamAV detected malware: ${result.viruses.join(', ')}`, { correlationId });
        return {
          status: 'SecurityScanFailed',
          scanner: 'ClamAV',
          correlationId,
        };
      }

      // Clean result (no error thrown = success)
      return {
        status: 'SecurityScanPending', // Will be updated after PDF validation
        scanner: 'ClamAV',
        correlationId,
      };
    } catch (error) {
      console.error(`ClamAV connection error: ${error instanceof Error ? error.message : 'unknown'}`, { correlationId });
      return {
        status: 'SecurityScanPending',
        scanner: null,
        correlationId,
      };
    }
  }

  private isPdf(buffer: Uint8Array): boolean {
    return buffer.subarray(0, 5).toString() === '%PDF-';
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
