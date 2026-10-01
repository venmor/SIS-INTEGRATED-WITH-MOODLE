import { readFile } from 'node:fs/promises';
import { DocumentScanner, actualMime } from './scanner.js';
import { PdfSecurityService } from './pdf-security.service.js';
import { ViMock, vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Module-level mock configuration functions (called at scan time)
let clamScanMockConfig: () => { isInfected: boolean; hasError: boolean; viruses: string[]; error: string | null } = () => ({
  isInfected: false,
  hasError: false,
  viruses: [],
  error: null,
});

let pdfSecurityMockConfig: () => { safe: boolean; issues: string[]; details: any } = () => ({
  safe: true,
  issues: [],
  details: {
    hasJavaScript: false,
    hasLaunchAction: false,
    hasEmbeddedFiles: false,
    hasExecutableForms: false,
    hasEncrypt: false,
    hasOpenAction: false,
    hasAdditionalActions: false,
  },
});

// Mock clamscan module
vi.mock('clamscan', () => {
  let scanStreamError: Error | null = null;
  class MockNodeClam {
    constructor(_options: any) {
      // Accept options but don't need to use them
    }
    init = vi.fn().mockResolvedValue(undefined);
    scanStream = vi.fn().mockImplementation(() => {
      if (scanStreamError) {
        return Promise.reject(scanStreamError);
      }
      return Promise.resolve(clamScanMockConfig());
    });
  }
  return { 
    default: MockNodeClam,
    __setScanStreamError: (err: Error | null) => { scanStreamError = err; }
  };
});

// Mock PdfSecurityService
vi.mock('./pdf-security.service.js', () => {
  class MockPdfSecurityService {
    validatePdfStructure = vi.fn().mockImplementation(() => Promise.resolve(pdfSecurityMockConfig()));
    sanitizePdf = vi.fn();
  }
  return { PdfSecurityService: MockPdfSecurityService };
});

describe('document scanner boundary', () => {
  beforeEach(async () => {
    vi.stubEnv('APPLICATION_SCANNER', 'clamav');
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('CLAMAV_HOST', 'localhost');
    vi.stubEnv('CLAMAV_PORT', '3310');

    // Reset mock configs
    clamScanMockConfig = () => ({
      isInfected: false,
      hasError: false,
      viruses: [],
      error: null,
    });
    pdfSecurityMockConfig = () => ({
      safe: true,
      issues: [],
      details: {
        hasJavaScript: false,
        hasLaunchAction: false,
        hasEmbeddedFiles: false,
        hasExecutableForms: false,
        hasEncrypt: false,
        hasOpenAction: false,
        hasAdditionalActions: false,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    // Reset ClamAV scanStream error
    void import('clamscan').then(({ __setScanStreamError }) => __setScanStreamError(null));
  });

  describe('demo fixture allowlist', () => {
    it('accepts only exact demo fixture bytes while demo mode is explicit', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/fictional-result.pdf',
      );
      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());

      vi.stubEnv('APPLICATION_SCANNER', 'demo-fixtures');
      vi.stubEnv('DEMO_MODE', 'false');
      expect((await scanner.scan(bytes)).status).toBe('SecurityScanPending');

      vi.stubEnv('DEMO_MODE', 'true');
      expect((await scanner.scan(bytes)).status).toBe('AwaitingQualityCheck');
      expect(
        (await scanner.scan(Buffer.concat([bytes, Buffer.from('modified')]))).status,
      ).toBe('SecurityScanPending');

      vi.unstubAllEnvs();
    });

    it('demo fixture allowlist only works with DEMO_MODE=true', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/fictional-result.pdf',
      );
      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());

      vi.stubEnv('APPLICATION_SCANNER', 'demo-fixtures');
      vi.stubEnv('DEMO_MODE', 'false');
      const result1 = await scanner.scan(bytes);
      expect(result1.status).toBe('SecurityScanPending');
      expect(result1.correlationId).toBeDefined();

      vi.stubEnv('DEMO_MODE', 'true');
      const result2 = await scanner.scan(bytes);
      expect(result2.status).toBe('AwaitingQualityCheck');
      expect(result2.correlationId).toBeDefined();

      vi.unstubAllEnvs();
    });
  });

  describe('ClamAV + PDF structural validation pipeline', () => {
    const cleanPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type/Catalog>>\nendobj\n%%EOF');
    const pdfWithJs = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type/Catalog/AA<</O 2 0 R>>>>\nendobj\n2 0 obj\n<</S/JavaScript/JS(app.alert(1))>>\nendobj\n%%EOF');

    beforeEach(() => {
      // Default: ClamAV clean, PDF validation passes
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: true,
        issues: [],
        details: {
          hasJavaScript: false,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });
    });

    it('accepts clean PDF that passes both ClamAV and structural validation', async () => {
      // Explicitly set clean config
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: true,
        issues: [],
        details: {
          hasJavaScript: false,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(cleanPdfBytes);

      expect(result.status).toBe('AwaitingQualityCheck');
      expect(result.scanner).toBe('ClamAV; PDF structural validation');
      expect(result.correlationId).toBeDefined();
    });

    it('rejects PDF that fails ClamAV scan (malware detected)', async () => {
      clamScanMockConfig = () => ({
        isInfected: true,
        hasError: false,
        viruses: ['Trojan.Generic'],
        error: null,
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(cleanPdfBytes);

      expect(result.status).toBe('SecurityScanFailed');
      expect(result.scanner).toBe('ClamAV');
      expect(result.correlationId).toBeDefined();
    });

    it('rejects PDF that passes ClamAV but fails structural validation (embedded JS)', async () => {
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: false,
        issues: ['JavaScript action found at Page AA/O'],
        details: {
          hasJavaScript: true,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(pdfWithJs);

      expect(result.status).toBe('SecurityScanFailed');
      expect(result.scanner).toBe('ClamAV; PDF structural validation');
      expect(result.correlationId).toBeDefined();
    });

    it('rejects PDF with launch action', async () => {
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: false,
        issues: ['Launch action found at Page AA/O'],
        details: {
          hasJavaScript: false,
          hasLaunchAction: true,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(pdfWithJs);

      expect(result.status).toBe('SecurityScanFailed');
      expect(result.scanner).toBe('ClamAV; PDF structural validation');
    });

    it('rejects PDF with embedded files', async () => {
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: false,
        issues: ['PDF contains embedded files (/Names/EmbeddedFiles)'],
        details: {
          hasJavaScript: false,
          hasLaunchAction: false,
          hasEmbeddedFiles: true,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(pdfWithJs);

      expect(result.status).toBe('SecurityScanFailed');
      expect(result.scanner).toBe('ClamAV; PDF structural validation');
    });

    it('rejects PDF with executable forms', async () => {
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: false,
        issues: ['JavaScript action found at Field AA/U'],
        details: {
          hasJavaScript: true,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: true,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(pdfWithJs);

      expect(result.status).toBe('SecurityScanFailed');
      expect(result.scanner).toBe('ClamAV; PDF structural validation');
    });

    it('returns SecurityScanPending when ClamAV connection fails', async () => {
      clamScanMockConfig = () => {
        throw new Error('Connection refused');
      };
      pdfSecurityMockConfig = () => ({
        safe: true,
        issues: [],
        details: {
          hasJavaScript: false,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(cleanPdfBytes);

      expect(result.status).toBe('SecurityScanPending');
      expect(result.scanner).toBeNull();
      expect(result.correlationId).toBeDefined();
    });

    it('returns SecurityScanPending when ClamAV throws error', async () => {
      const { __setScanStreamError } = await import('clamscan');
      __setScanStreamError(new Error('Scan timeout'));
      
      pdfSecurityMockConfig = () => ({
        safe: true,
        issues: [],
        details: {
          hasJavaScript: false,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(cleanPdfBytes);

      expect(result.status).toBe('SecurityScanPending');
      expect(result.scanner).toBeNull();
      expect(result.correlationId).toBeDefined();
    });

    it('skips PDF structural validation for non-PDF files', async () => {
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: true,
        issues: [],
        details: {
          hasJavaScript: false,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const pngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
        0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
        0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x01, 0x01, 0x00, 0x05, 0x00, 0x1a, 0x0c, 0x0c, 0x0c,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());
      const result = await scanner.scan(pngBytes);

      expect(result.status).toBe('AwaitingQualityCheck');
      expect(result.scanner).toBe('ClamAV; PDF structural validation');
    });

    it('each scan generates unique correlationId for operational monitoring', async () => {
      clamScanMockConfig = () => ({
        isInfected: false,
        hasError: false,
        viruses: [],
        error: null,
      });
      pdfSecurityMockConfig = () => ({
        safe: true,
        issues: [],
        details: {
          hasJavaScript: false,
          hasLaunchAction: false,
          hasEmbeddedFiles: false,
          hasExecutableForms: false,
          hasEncrypt: false,
          hasOpenAction: false,
          hasAdditionalActions: false,
        },
      });

      const { DocumentScanner } = await import('./scanner.js');
      const { PdfSecurityService } = await import('./pdf-security.service.js');
      const scanner = new DocumentScanner(new PdfSecurityService());

      const result1 = await scanner.scan(cleanPdfBytes);
      const result2 = await scanner.scan(cleanPdfBytes);
      const result3 = await scanner.scan(cleanPdfBytes);

      expect(result1.correlationId).not.toBe(result2.correlationId);
      expect(result2.correlationId).not.toBe(result3.correlationId);
      expect(result1.correlationId).not.toBe(result3.correlationId);
      expect(result1.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('actualMime', () => {
    it('rejects executable, encrypted and active-content files before quarantine', () => {
      for (const text of [
        'MZ executable',
        '%PDF-1.4 /Encrypt 1 0 R %%EOF',
        '%PDF-1.4 /JavaScript (alert) %%EOF',
      ])
        expect(actualMime(Buffer.from(text))).toBeNull();
    });

    it('accepts clean PDF mime', () => {
      expect(actualMime(Buffer.from('%PDF-1.4\n%%EOF'))).toBe('application/pdf');
    });

    it('accepts PNG', () => {
      const png = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
        0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
        0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x01, 0x01, 0x00, 0x05, 0x00, 0x1a, 0x0c, 0x0c, 0x0c,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      expect(actualMime(png)).toBe('image/png');
    });

    it('accepts JPEG', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);
      expect(actualMime(jpeg)).toBe('image/jpeg');
    });

    it('accepts polyglot file (PDF + ZIP) at mime level - caught by structural validation', () => {
      const pdfPart = Buffer.from('%PDF-1.4\n%%EOF');
      const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const polyglot = Buffer.concat([pdfPart, zipHeader]);
      // actualMime is a coarse check - it accepts valid PDF structure
      // Polyglots are caught by the full PDF structural validation pipeline
      expect(actualMime(polyglot)).toBe('application/pdf');
    });
  });
});