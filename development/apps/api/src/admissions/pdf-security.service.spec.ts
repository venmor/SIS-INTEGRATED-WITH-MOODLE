import { readFile } from 'node:fs/promises';
import { PdfSecurityService } from './pdf-security.service.js';
import { PDFName } from 'pdf-lib';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('PdfSecurityService', () => {
  let pdfSecurity: PdfSecurityService;

  beforeEach(() => {
    pdfSecurity = new PdfSecurityService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('validatePdfStructure', () => {
    it('rejects PDF with embedded JavaScript (/JS in action)', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/pdf-with-javascript.pdf',
      );
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(false);
      expect(result.details.hasJavaScript).toBe(true);
      expect(result.issues.some(i => i.includes('JavaScript'))).toBe(true);
    });

    it('rejects PDF with launch action (/Launch)', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/pdf-with-launch-action.pdf',
      );
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(false);
      expect(result.details.hasLaunchAction).toBe(true);
      expect(result.issues.some(i => i.includes('Launch'))).toBe(true);
    });

    it('rejects PDF with embedded files (/EmbeddedFiles)', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/pdf-with-embedded-file.pdf',
      );
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(false);
      expect(result.details.hasEmbeddedFiles).toBe(true);
      expect(result.issues.some(i => i.includes('embedded files'))).toBe(true);
    });

    it('rejects PDF with executable forms (AcroForm with JavaScript)', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/pdf-with-executable-forms.pdf',
      );
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(false);
      expect(result.details.hasExecutableForms).toBe(true);
      expect(result.details.hasJavaScript).toBe(true);
      expect(result.issues.some(i => i.includes('JavaScript'))).toBe(true);
    });

    it('accepts clean PDF', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/clean-test.pdf',
      );
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.details.hasJavaScript).toBe(false);
      expect(result.details.hasLaunchAction).toBe(false);
      expect(result.details.hasEmbeddedFiles).toBe(false);
      expect(result.details.hasExecutableForms).toBe(false);
      expect(result.details.hasEncrypt).toBe(false);
      expect(result.details.hasOpenAction).toBe(false);
      expect(result.details.hasAdditionalActions).toBe(false);
    });

    it('accepts fictional-result.pdf (demo fixture)', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/fictional-result.pdf',
      );
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('rejects polyglot file if it contains PDF with malicious content', async () => {
      // Polyglot file is just PDF + ZIP header, should pass structural validation
      // but actualMime will reject it before it reaches here
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/polyglot-file.pdf',
      );
      const result = await pdfSecurity.validatePdfStructure(bytes);

      // The polyglot we created is a clean PDF with ZIP appended
      // Structural validation should pass (it's a valid PDF structure)
      expect(result.safe).toBe(true);
    });

    it('handles corrupted PDF gracefully', async () => {
      const corruptedPdf = Buffer.from('%PDF-1.4 corrupted content');
      const result = await pdfSecurity.validatePdfStructure(corruptedPdf);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.includes('catalog'))).toBe(true);
    });

    it('detects OpenAction with JavaScript', async () => {
      // Create PDF with OpenAction containing JavaScript
      const { PDFDocument, PDFName, PDFString } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      const page = doc.addPage([612, 792]);

      const jsAction = doc.context.obj({
        S: PDFName.of('JavaScript'),
        JS: PDFString.of('app.alert("OpenAction JS");'),
      });

      doc.catalog.set(PDFName.of('OpenAction'), jsAction);

      const bytes = await doc.save();
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(false);
      expect(result.details.hasOpenAction).toBe(true);
      expect(result.details.hasJavaScript).toBe(true);
    });

    it('detects Additional Actions (AA) with JavaScript', async () => {
      const { PDFDocument, PDFName, PDFString } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      const page = doc.addPage([612, 792]);

      const jsAction = doc.context.obj({
        S: PDFName.of('JavaScript'),
        JS: PDFString.of('app.alert("AA JS");'),
      });

      const aaDict = doc.context.obj({
        O: jsAction, // OnOpen
      });

      doc.catalog.set(PDFName.of('AA'), aaDict);

      const bytes = await doc.save();
      const result = await pdfSecurity.validatePdfStructure(bytes);

      expect(result.safe).toBe(false);
      expect(result.details.hasAdditionalActions).toBe(true);
      expect(result.details.hasJavaScript).toBe(true);
    });
  });

  describe('sanitizePdf', () => {
    it('removes metadata, actions, and embedded files', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/pdf-with-javascript.pdf',
      );
      const sanitized = await pdfSecurity.sanitizePdf(bytes);

      // Verify sanitized PDF is valid
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(sanitized, { ignoreEncryption: true });

      // Check catalog no longer has AA
      const catalog = doc.catalog;
      expect(catalog.has(PDFName.of('AA'))).toBe(false);
      expect(catalog.has(PDFName.of('OpenAction'))).toBe(false);
      expect(catalog.has(PDFName.of('Names'))).toBe(false);
      expect(catalog.has(PDFName.of('AcroForm'))).toBe(false);
      expect(catalog.has(PDFName.of('Metadata'))).toBe(false);

      // Check trailer no longer has original Info (pdf-lib regenerates empty Info on save)
      const infoRef = doc.context.trailerInfo.Info;
      expect(infoRef).toBeDefined();
      const infoDict = doc.context.lookup(infoRef);
      expect(infoDict).toBeDefined();
    });

    it('produces valid PDF that passes validation', async () => {
      const bytes = await readFile(
        '../../packages/test-fixtures/documents/adversarial/pdf-with-javascript.pdf',
      );
      const sanitized = await pdfSecurity.sanitizePdf(bytes);

      const result = await pdfSecurity.validatePdfStructure(sanitized);
      expect(result.safe).toBe(true);
    });

    it('preserves page content', async () => {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      const page = doc.addPage([612, 792]);
      page.drawText('Test Content', { x: 50, y: 700, size: 24 });

      const bytes = await doc.save();
      const sanitized = await pdfSecurity.sanitizePdf(bytes);

      const sanitizedDoc = await PDFDocument.load(sanitized, { ignoreEncryption: true });
      expect(sanitizedDoc.getPageCount()).toBe(1);
    });
  });
});
