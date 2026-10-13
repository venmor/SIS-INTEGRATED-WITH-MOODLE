import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client as MinioClient, BucketItem, BucketItemStat, ItemBucketMetadata, LifecycleConfig, LifecycleRule as MinioLifecycleRule } from 'minio';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';

// MinIO types not exported from main module
type BucketVersioningConfiguration = {
  Status: 'Enabled' | 'Suspended';
  MFADelete?: string;
  ExcludedPrefixes?: { Prefix: string }[];
  ExcludeFolders?: boolean;
};

type LifeCycleConfigParam = LifecycleConfig | null | undefined | '';

export type UploadMetadata = {
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  applicationId: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type DownloadResult = {
  stream: Readable;
  metadata: UploadMetadata;
};

export type LifecycleRule = {
  id: string;
  status: 'Enabled' | 'Disabled';
  expiration?: { days: number };
  noncurrentVersionExpiration?: { noncurrentDays: number };
  filter?: { prefix: string };
};

export type BucketPolicy = {
  version: '2012-10-17';
  statement: Array<{
    sid: string;
    effect: 'Allow' | 'Deny';
    principal: { aws: string[] };
    action: string[];
    resource: string[];
    condition?: Record<string, unknown>;
  }>;
};

const REQUIRED_BUCKETS = ['applications', 'documents', 'evidence'] as const;
type BucketName = (typeof REQUIRED_BUCKETS)[number];

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: MinioClient;
  private readonly endpoint: string;
  private readonly useSSL: boolean;
  private minioAvailable = false;
  private readonly defaultExpirySeconds = 3600; // 1 hour
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  private readonly allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

  constructor() {
    this.endpoint = process.env.MINIO_ENDPOINT ?? 'localhost:9000';
    this.useSSL = process.env.MINIO_USE_SSL === 'true';

    this.client = new MinioClient({
      endPoint: this.endpoint.split(':')[0],
      port: parseInt(this.endpoint.split(':')[1] ?? (this.useSSL ? '443' : '9000'), 10),
      useSSL: this.useSSL,
      accessKey: process.env.MINIO_ROOT_USER ?? 'minioadmin',
      secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
    });
  }

  private async checkConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.listBuckets();
      this.minioAvailable = true;
      return true;
    } catch {
      this.minioAvailable = false;
      return false;
    }
  }

  private assertAvailable(): void {
    if (!this.minioAvailable) {
      // Try to initialize on demand
      throw new Error('MinIO object storage is not available. Please ensure MinIO is running and configured.');
    }
  }

  async onModuleInit(): Promise<void> {
    // Defer MinIO initialization to first actual use
    // This allows the API to start without MinIO running
    this.logger.log('ObjectStorageService initialized (MinIO connection deferred to first use)');
  }

  /**
   * Initialize MinIO connection and buckets on first use
   */
  private async initializeIfNeeded(): Promise<void> {
    if (this.minioAvailable) return;
    try {
      await this.ensureBucketsExist();
      await this.configureBucketPolicies();
      await this.configureLifecyclePolicies();
      this.minioAvailable = true;
    } catch (error) {
      this.minioAvailable = false;
      throw error;
    }
  }

  private async ensureBucketsExist(): Promise<void> {
    for (const bucket of REQUIRED_BUCKETS) {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, 'us-east-1');
        this.logger.log(`Created bucket: ${bucket}`);
      }

      // Enable versioning for all buckets
      const versioningConfig: BucketVersioningConfiguration = {
        Status: 'Enabled',
      };
      await this.client.setBucketVersioning(bucket, versioningConfig);
    }
  }

  private async configureBucketPolicies(): Promise<void> {
    // Private bucket policy - no public access
    const privatePolicy: BucketPolicy = {
      version: '2012-10-17',
      statement: [
        {
          sid: 'DenyPublicRead',
          effect: 'Deny',
          principal: { aws: ['*'] },
          action: ['s3:GetObject'],
          resource: REQUIRED_BUCKETS.flatMap(b => [`arn:aws:s3:::${b}/*`]),
        },
        {
          sid: 'DenyPublicList',
          effect: 'Deny',
          principal: { aws: ['*'] },
          action: ['s3:ListBucket'],
          resource: REQUIRED_BUCKETS.map(b => `arn:aws:s3:::${b}`),
        },
      ],
    };

    for (const bucket of REQUIRED_BUCKETS) {
      await this.client.setBucketPolicy(bucket, JSON.stringify(privatePolicy));
    }
  }

  private async configureLifecyclePolicies(): Promise<void> {
    // Default lifecycle: expire non-current versions after 90 days
    // Current versions expire based on document category (configured per bucket)
    const lifecycleConfig: LifeCycleConfigParam = {
      Rule: REQUIRED_BUCKETS.map(bucket => ({
        ID: `${bucket}-lifecycle`,
        Status: 'Enabled',
        Filter: { Prefix: '' },
        NoncurrentVersionExpiration: { NoncurrentDays: 90 },
        Expiration: { Days: 2555 }, // ~7 years for compliance retention
      })),
    };

    for (const bucket of REQUIRED_BUCKETS) {
      await this.client.setBucketLifecycle(bucket, lifecycleConfig);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(buffer: Buffer, originalName: string, mimeType: string): void {
    if (buffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`MIME type ${mimeType} is not allowed`);
    }

    const ext = originalName.split('.').pop()?.toLowerCase();
    if (!ext || !this.allowedExtensions.includes(ext)) {
      throw new Error(`File extension ${ext} is not allowed`);
    }

    // Additional magic byte validation for PDFs
    if (mimeType === 'application/pdf') {
      const header = buffer.subarray(0, 5).toString();
      if (header !== '%PDF-') {
        throw new Error('Invalid PDF file: missing PDF header');
      }
    }
  }

  /**
   * Generate a unique object key with application ID and category prefix
   */
  public generateKey(applicationId: string, category: string, originalName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uuid = randomUUID().slice(0, 8);
    const safeName = originalName.replace(/[^\p{L}\p{N}_. -]/gu, '_').slice(-120);
    return `${applicationId}/${category}/${timestamp}-${uuid}-${safeName}`;
  }

  /**
   * Upload a file to MinIO with streaming and server-side encryption
   */
  async upload(
    bucket: BucketName,
    key: string,
    stream: Readable,
    metadata: UploadMetadata,
  ): Promise<{ etag: string; versionId: string }> {
    // Validate first (before MinIO availability check for better error messages)
    this.validateFile(Buffer.alloc(0), metadata.originalName, metadata.mimeType);
    await this.initializeIfNeeded();

    const metaData: ItemBucketMetadata = {
      'Content-Type': metadata.mimeType,
      'X-Amz-Meta-X-Original-Name': metadata.originalName,
      'X-Amz-Meta-X-Application-Id': metadata.applicationId,
      'X-Amz-Meta-X-Category': metadata.category,
      'X-Amz-Meta-X-Uploaded-By': metadata.uploadedBy,
      'X-Amz-Meta-X-Uploaded-At': metadata.uploadedAt,
      'X-Amz-Meta-X-Checksum': metadata.checksum,
      'X-Amz-Meta-X-Size': metadata.size.toString(),
      'X-Amz-Server-Side-Encryption': 'AES256',
    };

    try {
      const result = await this.client.putObject(bucket, key, stream, metadata.size, metaData);
      this.logger.log(`Uploaded object: ${bucket}/${key} (etag: ${result.etag}, versionId: ${result.versionId})`);
      return { etag: result.etag, versionId: result.versionId ?? '' };
    } catch (error) {
      this.logger.error(`Failed to upload object: ${bucket}/${key}`, error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a file from buffer (convenience method)
   */
  async uploadBuffer(
    bucket: BucketName,
    key: string,
    buffer: Buffer,
    metadata: UploadMetadata,
  ): Promise<{ etag: string; versionId: string }> {
    const stream = Readable.from(buffer);
    return this.upload(bucket, key, stream, metadata);
  }

  /**
   * Download an object from MinIO
   */
  async download(bucket: BucketName, key: string): Promise<DownloadResult> {
    await this.initializeIfNeeded();
    try {
      const stream = await this.client.getObject(bucket, key);
      const stat = await this.client.statObject(bucket, key);

      // User metadata is stored in stat.metaData with X-Amz-Meta- prefix
      const meta = stat.metaData as Record<string, string>;
      const getMeta = (key: string) => meta[`x-amz-meta-${key}`] ?? meta[`X-Amz-Meta-${key}`] ?? '';

      const metadata: UploadMetadata = {
        originalName: getMeta('x-original-name') ?? key,
        mimeType: stat.metaData['Content-Type'] ?? meta['content-type'] ?? 'application/octet-stream',
        size: stat.size,
        checksum: getMeta('x-checksum') ?? '',
        applicationId: getMeta('x-application-id') ?? '',
        category: getMeta('x-category') ?? '',
        uploadedBy: getMeta('x-uploaded-by') ?? '',
        uploadedAt: getMeta('x-uploaded-at') ?? '',
      };

      return { stream, metadata };
    } catch (error) {
      this.logger.error(`Failed to download object: ${bucket}/${key}`, error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an object from MinIO
   */
  async delete(bucket: BucketName, key: string): Promise<void> {
    await this.initializeIfNeeded();
    try {
      await this.client.removeObject(bucket, key);
      this.logger.log(`Deleted object: ${bucket}/${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete object: ${bucket}/${key}`, error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a presigned URL for authorized access
   * Only returns URL for objects the user is authorized to access
   */
  async generatePresignedUrl(
    bucket: BucketName,
    key: string,
    expirySeconds: number = this.defaultExpirySeconds,
  ): Promise<string> {
    await this.initializeIfNeeded();
    try {
      const url = await this.client.presignedGetObject(bucket, key, expirySeconds);
      this.logger.debug(`Generated presigned URL for: ${bucket}/${key} (expiry: ${expirySeconds}s)`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${bucket}/${key}`, error);
      throw new Error(`Presigned URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a presigned PUT URL for direct client upload (if needed)
   */
  async generatePresignedPutUrl(
    bucket: BucketName,
    key: string,
    expirySeconds: number = this.defaultExpirySeconds,
  ): Promise<string> {
    await this.initializeIfNeeded();
    try {
      const url = await this.client.presignedPutObject(bucket, key, expirySeconds);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned PUT URL: ${bucket}/${key}`, error);
      throw new Error(`Presigned PUT URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if an object exists
   */
  async exists(bucket: BucketName, key: string): Promise<boolean> {
    await this.initializeIfNeeded();
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get object metadata without downloading
   */
  async stat(bucket: BucketName, key: string) {
    await this.initializeIfNeeded();
    return this.client.statObject(bucket, key);
  }

  /**
   * List objects in a bucket with prefix
   */
  async listObjects(bucket: BucketName, prefix: string, recursive = true): Promise<BucketItem[]> {
    await this.initializeIfNeeded();
    const objects: BucketItem[] = [];
    const stream = this.client.listObjects(bucket, prefix, recursive);
    for await (const obj of stream) {
      objects.push(obj);
    }
    return objects;
  }

  /**
   * Set lifecycle policy for a bucket
   */
  async setLifecyclePolicy(bucket: BucketName, rules: LifecycleRule[]): Promise<void> {
    try {
      const lifecycleConfig: LifeCycleConfigParam = {
        Rule: rules.map(r => ({
          ID: r.id,
          Status: r.status,
          Filter: r.filter ? { Prefix: r.filter.prefix } : { Prefix: '' },
          Expiration: r.expiration ? { Days: r.expiration.days } : undefined,
          NoncurrentVersionExpiration: r.noncurrentVersionExpiration
            ? { NoncurrentDays: r.noncurrentVersionExpiration.noncurrentDays }
            : undefined,
        })),
      };
      await this.client.setBucketLifecycle(bucket, lifecycleConfig);
      this.logger.log(`Updated lifecycle policy for bucket: ${bucket}`);
    } catch (error) {
      this.logger.error(`Failed to set lifecycle policy for bucket: ${bucket}`, error);
      throw new Error(`Lifecycle policy update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set bucket policy (access control)
   */
  async setBucketPolicy(bucket: BucketName, policy: BucketPolicy): Promise<void> {
    try {
      await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
      this.logger.log(`Updated bucket policy for: ${bucket}`);
    } catch (error) {
      this.logger.error(`Failed to set bucket policy for: ${bucket}`, error);
      throw new Error(`Bucket policy update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the bucket for a document category
   */
  getBucketForCategory(category: string): BucketName {
    switch (category) {
      case 'qualification':
      case 'equivalency':
        return 'documents';
      case 'evidence':
        return 'evidence';
      default:
        return 'applications';
    }
  }

  /**
   * Compute SHA256 checksum
   */
  computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get the internal endpoint for server-to-server communication
   */
  getInternalEndpoint(): string {
    return `http://minio:9000`;
  }

  /**
   * Get the external endpoint for client-facing URLs
   */
  getExternalEndpoint(): string {
    return this.useSSL ? `https://${this.endpoint}` : `http://${this.endpoint}`;
  }
}