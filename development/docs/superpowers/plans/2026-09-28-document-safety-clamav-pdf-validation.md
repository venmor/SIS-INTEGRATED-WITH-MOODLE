# Document Safety: ClamAV + PDF Structural Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy ClamAV in Docker Compose and implement PDF structural/sanitization adapter to replace demo fixture allowlist for production document safety.

**Architecture:** Add ClamAV service to docker-compose.yml, create PdfSecurityService using pdf-lib for structural PDF validation (rejecting embedded JS, launch actions, embedded files, executable forms), update DocumentScanner to pipeline: Quarantine → ClamAV scan → PDF structural validation → Release/Reject. Demo fixture allowlist gated behind DEMO_MODE only.

**Tech Stack:** ClamAV (clamav/clamav:latest with freshclam), pdf-lib for PDF parsing/sanitization, clamscan npm package for ClamAV client, NestJS, Vitest.

**Spec:** /home/hangoma/SIS-INTEGRATED-WITH-MOODLE/development/docs/gaps/GAP-015-applicant-production-and-prior-phase-gates.md (Row 11: "Arbitrary document safety")

## Global Constraints

- Locked stack: NestJS + TypeScript, PostgreSQL + Prisma, Docker Compose, GitHub Actions, Playwright
- No Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, AI chatbot
- Follow handbook authority order: later approved decisions, security/privacy/official-record rules, exact evidence, curated handbooks, then templates/examples
- Keep module boundaries explicit; minimize dependencies and cross-module coupling
- Add allow and deny tests plus failure, recovery, security, accessibility, API/integration, and E2E coverage required by the task packet
- Scanner failure is never interpreted as safe. No shell or user-controlled command.
- Quarantine behavior: all PDFs remain quarantined until structural validation passes

## Review Focus

1. **Adversarial PDF with embedded JavaScript** - Must be rejected during structural validation, not pass through ClamAV clean exit
2. **PDF with launch action (/Launch)** - Must be rejected; can execute arbitrary commands
3. **PDF with embedded files (/EmbeddedFiles)** - Must be rejected; can hide malicious payloads
4. **PDF with executable forms (AcroForm with JavaScript)** - Must be rejected; can execute code on open
5. **Polyglot files** - Must be rejected by actualMime before reaching scanner

---

### Task 1: Add ClamAV service to docker-compose.yml

**Files:**
- Modify: `development/docker-compose.yml`

**Interfaces:**
- Produces: ClamAV service running on port 3310 (TCP), freshclam for signature updates

- [ ] **Step 1: Add ClamAV service definition to docker-compose.yml**

```yaml
clamav:
  image: clamav/clamav:latest
  container_name: sis-clamav
  restart: unless-stopped
  ports:
    - "3310:3310"
  volumes:
    - clamav-db:/var/lib/clamav
  healthcheck:
    test: ["CMD-SHELL", "clamdscan --ping"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 60s
```

- [ ] **Step 2: Add clamav-db volume to volumes section**

```yaml
volumes:
  pgdata:
  clamav-db:
```

- [ ] **Step 3: Verify docker-compose up brings up ClamAV healthy**

Run: `docker-compose up -d clamav && docker-compose ps clamav`
Expected: Status "healthy"

---

### Task 2: Install pdf-lib and clamscan dependencies

**Files:**
- Modify: `development/apps/api/package.json`

**Interfaces:**
- Produces: pdf-lib for PDF parsing/sanitization, clamscan for ClamAV client

- [ ] **Step 1: Add pdf-lib and clamscan to dependencies**

Run: `npm install pdf-lib clamscan --workspace=api`
Expected: Dependencies added to package.json

---

### Task 3: Create PdfSecurityService for PDF structural validation

**Files:**
- Create: `development/apps/api/src/admissions/pdf-security.service.ts`

**Interfaces:**
- Consumes: pdf-lib (PDFDocument, PDFName, PDFDict, PDFArray, PDFStream)
- Produces: 
  - `validatePdfStructure(buffer: Uint8Array): Promise<ValidationResult>`
  - `sanitizePdf(buffer: Uint8Array): Promise<Uint8Array>`

**ValidationResult:**
```typescript
interface ValidationResult {
  safe: boolean;
  issues: string[];
  details: {
    hasJavaScript: boolean;
    hasLaunchAction: boolean;
    hasEmbeddedFiles: boolean;
    hasExecutableForms: boolean;
    hasEncrypt: boolean;
    hasOpenAction: boolean;
    hasAdditionalActions: boolean;
  };
}
```

- [ ] **Step 1: Write failing test for PDF structural validation**

```typescript
// In scanner.spec.ts or new pdf-security.spec.ts
it('rejects PDF with embedded JavaScript (/JS)', async () => {
  const pdfWithJs = createPdfWithJavaScript();
  const result = await pdfSecurityService.validatePdfStructure(pdfWithJs);
  expect(result.safe).toBe(false);
  expect(result.details.hasJavaScript).toBe(true);
});

it('rejects PDF with launch action (/Launch)', async () => {
  const pdfWithLaunch = createPdfWithLaunchAction();
  const result = await pdfSecurityService.validatePdfStructure(pdfWithLaunch);
  expect(result.safe).toBe(false);
  expect(result.details.hasLaunchAction).toBe(true);
});

it('rejects PDF with embedded files (/EmbeddedFiles)', async () => {
  const pdfWithEmbedded = createPdfWithEmbeddedFiles();
  const result = await pdfSecurityService.validatePdfStructure(pdfWithEmbedded);
  expect(result.safe).toBe(false);
  expect(result.details.hasEmbeddedFiles).toBe(true);
});

it('rejects PDF with executable forms', async () => {
  const pdfWithForms = createPdfWithExecutableForms();
  const result = await pdfSecurityService.validatePdfStructure(pdfWithForms);
  expect(result.safe).toBe(false);
  expect(result.details.hasExecutableForms).toBe(true);
});

it('accepts clean PDF', async () => {
  const cleanPdf = createCleanPdf();
  const result = await pdfSecurityService.validatePdfStructure(cleanPdf);
  expect(result.safe).toBe(true);
  expect(result.issues).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=api -- pdf-security.spec.ts`
Expected: FAIL (service not defined)

- [ ] **Step 3: Implement PdfSecurityService**

```typescript
// pdf-security.service.ts
import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFStream } from 'pdf-lib';

@Injectable()
export class PdfSecurityService {
  async validatePdfStructure(buffer: Uint8Array): Promise<ValidationResult> {
    // Load PDF with pdf-lib
    // Traverse document catalog and page tree
    // Check for /JavaScript, /JS in names
    // Check for /Launch in action dictionaries
    // Check for /EmbeddedFiles in name tree
    // Check for /AA (Additional Actions) with JavaScript
    // Check for /OpenAction with JavaScript
    // Check for /Encrypt dictionary
    // Check AcroForm fields for JavaScript actions
    // Return ValidationResult
  }

  async sanitizePdf(buffer: Uint8Array): Promise<Uint8Array> {
    // Load PDF
    // Strip metadata (Info dict, Metadata stream)
    // Flatten forms (remove AcroForm, set NeedAppearances=false)
    // Remove embedded files (delete EmbeddedFiles name tree)
    // Remove JavaScript actions
    // Remove launch actions
    // Save and return sanitized bytes
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=api -- pdf-security.spec.ts`
Expected: PASS

---

### Task 4: Update DocumentScanner to use ClamAV + PDF validation pipeline

**Files:**
- Modify: `development/apps/api/src/admissions/scanner.ts`

**Interfaces:**
- Consumes: PdfSecurityService (via NestJS DI), clamscan client
- Produces: Updated `scan()` method with pipeline:
  - Quarantine → ClamAV scan → PDF structural validation → Release/Reject

- [ ] **Step 1: Write failing tests for updated scanner pipeline**

```typescript
// In scanner.spec.ts
it('rejects PDF that passes ClamAV but fails structural validation (embedded JS)', async () => {
  const pdfWithJs = createPdfWithJavaScript();
  vi.stubEnv('APPLICATION_SCANNER', 'clamav');
  vi.stubEnv('DEMO_MODE', 'false');
  // Mock ClamAV to return clean (0)
  // Expect SecurityScanPending (quarantined) because structural validation fails
  expect((await scanner.scan(pdfWithJs)).status).toBe('SecurityScanPending');
});

it('accepts clean PDF that passes both ClamAV and structural validation', async () => {
  const cleanPdf = createCleanPdf();
  vi.stubEnv('APPLICATION_SCANNER', 'clamav');
  vi.stubEnv('DEMO_MODE', 'false');
  // Mock ClamAV to return clean (0)
  // Expect AwaitingQualityCheck
  expect((await scanner.scan(cleanPdf)).status).toBe('AwaitingQualityCheck');
});

it('rejects PDF that fails ClamAV scan', async () => {
  const infectedPdf = createInfectedPdf();
  vi.stubEnv('APPLICATION_SCANNER', 'clamav');
  vi.stubEnv('DEMO_MODE', 'false');
  // Mock ClamAV to return infected (1)
  // Expect SecurityScanFailed
  expect((await scanner.scan(infectedPdf)).status).toBe('SecurityScanFailed');
});

it('demo fixture allowlist only works with DEMO_MODE=true', async () => {
  const fixture = await readFile('../../packages/test-fixtures/documents/fictional-result.pdf');
  vi.stubEnv('APPLICATION_SCANNER', 'demo-fixtures');
  vi.stubEnv('DEMO_MODE', 'false');
  expect((await scanner.scan(fixture)).status).toBe('SecurityScanPending');
  vi.stubEnv('DEMO_MODE', 'true');
  expect((await scanner.scan(fixture)).status).toBe('AwaitingQualityCheck');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=api -- scanner.spec.ts`
Expected: FAIL

- [ ] **Step 3: Update DocumentScanner**

```typescript
// scanner.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClamScan } from 'clamscan';
import { PdfSecurityService } from './pdf-security.service.js';

export type ScanResult = {
  status: 'SecurityScanPending' | 'SecurityScanFailed' | 'AwaitingQualityCheck';
  scanner: string | null;
  correlationId: string; // For operational monitoring
};

@Injectable()
export class DocumentScanner {
  constructor(
    private readonly pdfSecurity: PdfSecurityService,
  ) {}

  async scan(content: Uint8Array): Promise<ScanResult> {
    const correlationId = crypto.randomUUID();
    
    // Demo fixture allowlist - ONLY when DEMO_MODE=true
    if (process.env.APPLICATION_SCANNER === 'demo-fixtures') {
      if (process.env.DEMO_MODE !== 'true') {
        return { status: 'SecurityScanPending', scanner: null, correlationId };
      }
      // Exact fixture check...
    }

    // Production pipeline: ClamAV + PDF structural validation
    if (process.env.APPLICATION_SCANNER === 'clamav') {
      // 1. ClamAV scan
      const clamavResult = await this.scanWithClamAV(content, correlationId);
      if (clamavResult.status === 'SecurityScanFailed') {
        return clamavResult;
      }
      if (clamavResult.status === 'SecurityScanPending') {
        return clamavResult; // ClamAV error/unavailable
      }

      // 2. PDF structural validation (only for PDFs)
      if (this.isPdf(content)) {
        const validation = await this.pdfSecurity.validatePdfStructure(content);
        if (!validation.safe) {
          // Log with correlationId for operational monitoring
          console.warn(`PDF rejected: ${validation.issues.join(', ')}`, { correlationId });
          return { 
            status: 'SecurityScanFailed', 
            scanner: 'ClamAV; PDF structural validation',
            correlationId 
          };
        }
        // Optional: sanitize PDF
        // const sanitized = await this.pdfSecurity.sanitizePdf(content);
      }

      return { 
        status: 'AwaitingQualityCheck', 
        scanner: 'ClamAV; PDF structural validation',
        correlationId 
      };
    }

    return { status: 'SecurityScanPending', scanner: null, correlationId };
  }

  private async scanWithClamAV(content: Uint8Array, correlationId: string): Promise<ScanResult> {
    // Use clamscan npm package to connect to ClamAV daemon on port 3310
    // Return appropriate ScanResult
  }

  private isPdf(buffer: Uint8Array): boolean {
    return buffer.subarray(0, 5).toString() === '%PDF-';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=api -- scanner.spec.ts`
Expected: PASS

---

### Task 5: Create adversarial test fixtures

**Files:**
- Create: `development/packages/test-fixtures/documents/adversarial/pdf-with-javascript.pdf`
- Create: `development/packages/test-fixtures/documents/adversarial/pdf-with-launch-action.pdf`
- Create: `development/packages/test-fixtures/documents/adversarial/pdf-with-embedded-file.pdf`
- Create: `development/packages/test-fixtures/documents/adversarial/pdf-with-executable-forms.pdf`
- Create: `development/packages/test-fixtures/documents/adversarial/polyglot-file.pdf`

**Interfaces:**
- Produces: Test PDF files that exercise each rejection path

- [ ] **Step 1: Create PDF with embedded JavaScript**

Use pdf-lib to generate:
```typescript
const doc = await PDFDocument.create();
const page = doc.addPage();
const jsAction = doc.context.obj({ S: 'JavaScript', JS: 'app.alert("malicious")' });
// Add to page or catalog
```

- [ ] **Step 2: Create PDF with launch action**

```typescript
const launchAction = doc.context.obj({ S: 'Launch', F: '/path/to/executable' });
```

- [ ] **Step 3: Create PDF with embedded files**

```typescript
const embeddedFile = doc.context.obj({ 
  Type: 'Filespec', 
  F: 'malware.exe', 
  EF: { F: streamRef } 
});
```

- [ ] **Step 4: Create PDF with executable forms**

```typescript
// Add AcroForm with JavaScript action on field
```

- [ ] **Step 5: Create polyglot file**

A file that is both a valid PDF and another format (e.g., PDF + ZIP)

- [ ] **Step 6: Verify all adversarial fixtures are rejected by scanner**

Run: `npm run test --workspace=api -- scanner.spec.ts`
Expected: All adversarial fixtures rejected with SecurityScanFailed

---

### Task 6: Update scanner.spec.ts with comprehensive tests

**Files:**
- Modify: `development/apps/api/src/admissions/scanner.spec.ts`

**Interfaces:**
- Consumes: DocumentScanner, PdfSecurityService, adversarial test fixtures
- Produces: Complete test coverage for all validation paths

- [ ] **Step 1: Add import for PdfSecurityService and test fixtures**

- [ ] **Step 2: Add tests for all adversarial PDF types**

- [ ] **Step 3: Add tests for operational monitoring (correlation ID logging)**

- [ ] **Step 4: Add test for sanitization output**

- [ ] **Step 5: Run all tests**

Run: `npm run test --workspace=api`
Expected: All tests pass

---

### Task 7: Update admissions.module.ts to provide PdfSecurityService

**Files:**
- Modify: `development/apps/api/src/admissions/admissions.module.ts`

**Interfaces:**
- Produces: PdfSecurityService in providers array

- [ ] **Step 1: Add PdfSecurityService to providers**

```typescript
import { PdfSecurityService } from './pdf-security.service.js';

@Module({
  // ...
  providers: [
    // ...
    DocumentScanner,
    PdfSecurityService,
    ApplicationRateGuard,
  ],
})
```

- [ ] **Step 2: Verify module compiles and tests pass**

Run: `npm run build --workspace=api && npm run test --workspace=api`
Expected: Build succeeds, all tests pass

---

### Task 8: End-to-end verification

**Files:**
- All modified/created files

- [ ] **Step 1: Run docker-compose up**

Run: `docker-compose up -d`
Expected: All services healthy (db, clamav)

- [ ] **Step 2: Run full test suite**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 3: Manual verification with adversarial fixtures**

Run: Test scanner against each adversarial fixture
Expected: All rejected with SecurityScanFailed

- [ ] **Step 4: Verify clean PDF passes**

Run: Test scanner against clean PDF
Expected: AwaitingQualityCheck

- [ ] **Step 5: Verify demo fixture still works with DEMO_MODE=true**

Run: Test scanner against fictional-result.pdf with DEMO_MODE=true
Expected: AwaitingQualityCheck (with demo fixture scanner)

- [ ] **Step 6: Verify demo fixture blocked without DEMO_MODE**

Run: Test scanner against fictional-result.pdf with DEMO_MODE=false
Expected: SecurityScanPending

---

### Task 9: Commit changes

```bash
git add development/docker-compose.yml
git add development/apps/api/package.json
git add development/apps/api/src/admissions/pdf-security.service.ts
git add development/apps/api/src/admissions/scanner.ts
git add development/apps/api/src/admissions/scanner.spec.ts
git add development/apps/api/src/admissions/admissions.module.ts
git add development/packages/test-fixtures/documents/adversarial/
git commit -m "feat: Document Safety - ClamAV + PDF structural validation (Task 1.4)"
```