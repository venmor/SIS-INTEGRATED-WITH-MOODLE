import type { Prisma } from '@prisma/client';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { RESULT_PUBLICATION_DEMO_V1 } from '@sis/config';

/** Supplied by approved effective-dated policy or isolated fictional fixture,
 * never by browser JSON. */
export interface PublicationPolicy {
  version: string;
  courseId: string;
  releaseAt: string;
  showMarks: boolean;
  reviewInstructions: string;
  restrictionsSatisfied: boolean;
}
export interface PublicationPolicyProvider {
  resolve(
    db: Prisma.TransactionClient,
    offeringRef: string,
    periodCode: string,
  ): Promise<PublicationPolicy | null>;
}
/** IAM consumes a verified single-use proof in the publication transaction.
 * Must bind actor, session, action and complete command digest (target/version).
 * No credentials/proof are ever copied into a receipt, audit or outbox. */
export interface ResultStepUpVerifier {
  consume(
    db: Prisma.TransactionClient,
    context: {
      actor: ActiveAuthority;
      sessionHash: string;
      action: string;
      commandDigest: string;
      proof?: string;
    },
  ): Promise<boolean>;
}
export const PUBLICATION_DECLARATION =
  'I confirm that I have reviewed the stated evidence and make this decision within my assigned authority.';

function isolatedDemoPolicyEnabled(): boolean {
  if (
    process.env.DEMO_MODE !== 'true' ||
    process.env.SIS_ENABLE_RESULT_DEMO_POLICY !== 'true'
  ) return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    return (
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      /(?:test|review|ci)/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export const demoPublicationPolicy: PublicationPolicyProvider = {
  async resolve(db, offeringRef, periodCode) {
    const profile = RESULT_PUBLICATION_DEMO_V1;
    if (
      !isolatedDemoPolicyEnabled() ||
      periodCode !== profile.periodCode ||
      !offeringRef.startsWith(profile.courseCodePrefix)
    ) return null;
    const [course, period] = await Promise.all([
      db.course.findUnique({ where: { code: offeringRef } }),
      db.academicPeriod.findUnique({ where: { code: periodCode } }),
    ]);
    if (!course || !period || period.status !== 'OPEN') return null;
    return {
      version: profile.version,
      courseId: course.id,
      releaseAt: profile.releaseAt,
      showMarks: profile.showMarks,
      reviewInstructions: profile.reviewInstructions,
      // Fictional fixtures contain no hold or incident authorities. This
      // statement never applies to an institutional course or database.
      restrictionsSatisfied: true,
    };
  },
};
export const publicationProviders = [
  {
    provide: 'RESULT_PUBLICATION_POLICY',
    useValue: demoPublicationPolicy,
  },
  {
    provide: 'RESULT_STEP_UP',
    useValue: { consume: async () => false } satisfies ResultStepUpVerifier,
  },
];
