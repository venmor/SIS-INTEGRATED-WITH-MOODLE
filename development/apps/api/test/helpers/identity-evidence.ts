import { readFile } from 'node:fs/promises';
import request from 'supertest';

// Exercise the real applicant upload and safety-check commands. A completed
// demonstration application needs identity evidence as well as results.
export async function completeIdentityEvidence(
  server: Parameters<typeof request>[0],
  csrf: Record<string, string>,
  cookie: string,
  applicationId: string,
  key: () => string,
) {
  const current = await request(server)
    .get(`/applications/${applicationId}`)
    .set('Cookie', cookie)
    .expect(200);
  const pdf = await readFile(
    new URL('../../../../packages/test-fixtures/documents/fictional-result.pdf', import.meta.url),
  );
  const uploaded = await request(server)
    .post(`/applications/${applicationId}/documents`)
    .set(csrf)
    .set('Cookie', cookie)
    .field('category', 'identity')
    .field('version', String(current.body.version))
    .field('idempotencyKey', key())
    .attach('file', pdf, 'fictional-identity.pdf')
    .expect(201);
  const documentId = uploaded.body.documents.at(-1)?.id as string;
  await request(server)
    .post(`/applications/${applicationId}/documents/${documentId}/scan`)
    .set(csrf)
    .set('Cookie', cookie)
    .send({ version: uploaded.body.version, idempotencyKey: key() })
    .expect(201);
}
