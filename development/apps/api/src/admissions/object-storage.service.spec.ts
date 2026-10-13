import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ObjectStorageService, UploadMetadata } from './object-storage.service.js';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

describe('ObjectStorageService', () => {
  let service: ObjectStorageService;
  const testBucket = 'applications' as const;
  const testKey = 'test-application/qualification/test-file.pdf';

  // Check if MinIO is available by trying to connect
  let minioAvailable = false;

  beforeAll(async () => {
    if (!process.env.MINIO_ENDPOINT) {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ROOT_USER = 'minioadmin';
      process.env.MINIO_ROOT_PASSWORD = 'minioadmin';
      process.env.MINIO_USE_SSL = 'false';
    }
    service = new ObjectStorageService();

    // Try to check if MinIO is reachable
    try {
      await (service as any).client.bucketExists(testBucket);
      minioAvailable = true;
    } catch {
      minioAvailable = false;
      console.log('MinIO not available - integration tests will be skipped');
    }
  });

  beforeEach(async () => {
    if (!minioAvailable) return;
    // Clean up any existing test objects
    try {
      await service.delete(testBucket, testKey);
    } catch {
      // Ignore if not exists
    }
  });

  afterAll(async () => {
    if (!minioAvailable) return;
    // Clean up test objects
    try {
      await service.delete(testBucket, testKey);
    } catch {
      // Ignore
    }
  });

  describe('upload validation (unit tests - no MinIO required)', () => {
    it('should reject unsupported MIME types', async () => {
      const buffer = Buffer.from('plain text content');
      const metadata: UploadMetadata = {
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await expect(service.uploadBuffer(testBucket, testKey, buffer, metadata))
        .rejects.toThrow('MIME type text/plain is not allowed');
    });

    it('should reject files with invalid extensions', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.exe',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await expect(service.uploadBuffer(testBucket, testKey, buffer, metadata))
        .rejects.toThrow('File extension exe is not allowed');
    });

    it('should reject PDF files without valid header', async () => {
      const buffer = Buffer.from('not a pdf');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await expect(service.uploadBuffer(testBucket, testKey, buffer, metadata))
        .rejects.toThrow('Invalid PDF file: missing PDF header');
    });
  });

  describe('computeChecksum (unit test - no MinIO required)', () => {
    it('should compute SHA256 checksum', () => {
      const buffer = Buffer.from('test content');
      const checksum = service.computeChecksum(buffer);
      expect(checksum).toBe(createHash('sha256').update(buffer).digest('hex'));
    });
  });

  describe('getBucketForCategory (unit test - no MinIO required)', () => {
    it('should return documents bucket for qualification category', () => {
      expect(service.getBucketForCategory('qualification')).toBe('documents');
    });

    it('should return documents bucket for equivalency category', () => {
      expect(service.getBucketForCategory('equivalency')).toBe('documents');
    });

    it('should return evidence bucket for evidence category', () => {
      expect(service.getBucketForCategory('evidence')).toBe('evidence');
    });

    it('should return applications bucket for unknown category', () => {
      expect(service.getBucketForCategory('unknown')).toBe('applications');
    });
  });

  // Integration tests - only run when MinIO is available
  (minioAvailable ? describe : describe.skip)('upload (integration tests - require MinIO)', () => {
    it('should upload a PDF buffer and return etag', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      const result = await service.uploadBuffer(testBucket, testKey, buffer, metadata);

      expect(result).toHaveProperty('etag');
      expect(result.etag).toBeTruthy();
    });

    it('should upload a JPEG buffer and return etag', async () => {
      // JPEG magic bytes: FF D8 FF
      const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9]);
      const metadata: UploadMetadata = {
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      const result = await service.uploadBuffer(testBucket, testKey, buffer, metadata);

      expect(result).toHaveProperty('etag');
      expect(result.etag).toBeTruthy();
    });

    it('should upload a PNG buffer and return etag', async () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F, 0x00, 0x05, 0xFE, 0x02, 0xFE, 0xA7, 0x5C, 0x4E, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
      const metadata: UploadMetadata = {
        originalName: 'test.png',
        mimeType: 'image/png',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      const result = await service.uploadBuffer(testBucket, testKey, buffer, metadata);

      expect(result).toHaveProperty('etag');
      expect(result.etag).toBeTruthy();
    });

    it('should reject files larger than max size', async () => {
      const buffer = Buffer.alloc(11 * 1024 * 1024); // 11MB > 10MB limit
      const metadata: UploadMetadata = {
        originalName: 'large.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await expect(service.uploadBuffer(testBucket, testKey, buffer, metadata))
        .rejects.toThrow('File size exceeds maximum allowed size');
    });
  });

  (minioAvailable ? describe : describe.skip)('download (integration tests - require MinIO)', () => {
    it('should download an uploaded file', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await service.uploadBuffer(testBucket, testKey, buffer, metadata);

      const result = await service.download(testBucket, testKey);

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.originalName).toBe('test.pdf');
      expect(result.metadata.mimeType).toBe('application/pdf');
      expect(result.metadata.size).toBe(buffer.length);

      // Read stream to verify content
      const chunks: Buffer[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      const downloaded = Buffer.concat(chunks);
      expect(downloaded).toEqual(buffer);
    });

    it('should throw error for non-existent object', async () => {
      await expect(service.download(testBucket, 'non-existent-key'))
        .rejects.toThrow('Download failed');
    });
  });

  (minioAvailable ? describe : describe.skip)('delete (integration tests - require MinIO)', () => {
    it('should delete an uploaded file', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await service.uploadBuffer(testBucket, testKey, buffer, metadata);
      await service.delete(testBucket, testKey);

      await expect(service.download(testBucket, testKey))
        .rejects.toThrow('Download failed');
    });
  });

  (minioAvailable ? describe : describe.skip)('generatePresignedUrl (integration tests - require MinIO)', () => {
    it('should generate a presigned URL for an existing object', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await service.uploadBuffer(testBucket, testKey, buffer, metadata);

      const url = await service.generatePresignedUrl(testBucket, testKey, 3600);

      expect(url).toBeTruthy();
      expect(url).toContain('http');
      expect(url).toContain(testBucket);
      expect(url).toContain(testKey);
    });

    it('should throw error for non-existent object', async () => {
      await expect(service.generatePresignedUrl(testBucket, 'non-existent-key'))
        .rejects.toThrow('Presigned URL generation failed');
    });
  });

  (minioAvailable ? describe : describe.skip)('exists (integration tests - require MinIO)', () => {
    it('should return true for existing object', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await service.uploadBuffer(testBucket, testKey, buffer, metadata);

      const exists = await service.exists(testBucket, testKey);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent object', async () => {
      const exists = await service.exists(testBucket, 'non-existent-key');
      expect(exists).toBe(false);
    });
  });

  (minioAvailable ? describe : describe.skip)('stat (integration tests - require MinIO)', () => {
    it('should return object metadata', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      await service.uploadBuffer(testBucket, testKey, buffer, metadata);

      const stat = await service.stat(testBucket, testKey);

      expect(stat).toHaveProperty('size');
      expect(stat.size).toBe(buffer.length);
      expect(stat).toHaveProperty('metaData');
      expect(stat.metaData['x-original-name']).toBe('test.pdf');
      expect(stat.metaData['x-application-id']).toBe('test-app-id');
    });
  });

  (minioAvailable ? describe : describe.skip)('listObjects (integration tests - require MinIO)', () => {
    it('should list objects with prefix', async () => {
      const buffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
      const metadata: UploadMetadata = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        applicationId: 'test-app-id',
        category: 'qualification',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
      };

      const key1 = 'test-app-id/qualification/test1.pdf';
      const key2 = 'test-app-id/qualification/test2.pdf';

      await service.uploadBuffer(testBucket, key1, buffer, metadata);
      await service.uploadBuffer(testBucket, key2, buffer, metadata);

      const objects = await service.listObjects(testBucket, 'test-app-id/qualification/');

      expect(objects.length).toBeGreaterThanOrEqual(2);
      expect(objects.some(o => o.name === key1)).toBe(true);
      expect(objects.some(o => o.name === key2)).toBe(true);
    });
  });
});
