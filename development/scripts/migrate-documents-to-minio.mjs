#!/usr/bin/env node
/**
 * Migration script to move existing ApplicationDocument content from PostgreSQL BYTEA to MinIO
 * 
 * Run with: DATABASE_URL=... MINIO_ENDPOINT=... MINIO_ROOT_USER=... MINIO_ROOT_PASSWORD=... node scripts/migrate-documents-to-minio.mjs
 */

import { PrismaClient } from '@prisma/client';
import { MinioClient } from 'minio';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting document migration to MinIO...');

  // Verify environment
  const minioEndpoint = process.env.MINIO_ENDPOINT ?? 'localhost:9000';
  const minioUser = process.env.MINIO_ROOT_USER ?? 'minioadmin';
  const minioPassword = process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin';
  const minioUseSSL = process.env.MINIO_USE_SSL === 'true';

  console.log(`MinIO Endpoint: ${minioEndpoint}`);
  console.log(`MinIO Use SSL: ${minioUseSSL}`);

  const minioClient = new MinioClient({
    endPoint: minioEndpoint.split(':')[0],
    port: parseInt(minioEndpoint.split(':')[1] ?? (minioUseSSL ? '443' : '9000'), 10),
    useSSL: minioUseSSL,
    accessKey: minioUser,
    secretKey: minioPassword,
  });

  // Ensure buckets exist
  const buckets = ['applications', 'documents', 'evidence'];
  for (const bucket of buckets) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket, 'us-east-1');
      console.log(`Created bucket: ${bucket}`);
    }
    // Enable versioning
    await minioClient.setBucketVersioning(bucket, 'Enabled');
  }

  // Fetch all documents with content
  const documents = await prisma.applicationDocument.findMany({
    where: {
      content: { not: null },
    },
    select: {
      id: true,
      applicationId: true,
      category: true,
      fileName: true,
      mimeType: true,
      size: true,
      content: true,
      sha256: true,
      version: true,
    },
  });

  console.log(`Found ${documents.length} documents to migrate`);

  let migrated = 0;
  let failed = 0;

  for (const doc of documents) {
    try {
      // Determine bucket based on category
      let bucket = 'documents';
      if (doc.category === 'evidence') bucket = 'evidence';
      else if (doc.category === 'qualification' || doc.category === 'equivalency') bucket = 'documents';
      else bucket = 'applications';

      // Generate key
      const key = `${doc.applicationId}/${doc.category}/legacy-${doc.id}-${doc.fileName.replace(/[^\p{L}\p{N}_. -]/gu, '_').slice(-120)}`;

      // Upload to MinIO
      const stream = Readable.from(doc.content as Buffer);
      await minioClient.putObject(bucket, key, stream, doc.size, {
        contentType: doc.mimeType,
        userMetadata: {
          'x-original-name': doc.fileName,
          'x-application-id': doc.applicationId,
          'x-category': doc.category,
          'x-uploaded-by': 'migration-script',
          'x-uploaded-at': new Date().toISOString(),
          'x-checksum': doc.sha256,
          'x-size': doc.size.toString(),
        },
        serverSideEncryption: 'AES256',
      });

      // Update database with bucket and key
      await prisma.applicationDocument.update({
        where: { id: doc.id },
        data: { bucket, key },
      });

      migrated++;
      if (migrated % 10 === 0) {
        console.log(`Migrated ${migrated}/${documents.length} documents...`);
      }
    } catch (error) {
      console.error(`Failed to migrate document ${doc.id}:`, error);
      failed++;
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});