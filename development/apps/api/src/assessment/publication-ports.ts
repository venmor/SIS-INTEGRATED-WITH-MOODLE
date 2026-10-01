import type { Prisma } from '@prisma/client';
import type { ActiveAuthority } from '../identity-access/active-authority.js';

/** Supplied by approved effective-dated policy, never by browser JSON. */
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
export const publicationProviders = [
  {
    provide: 'RESULT_PUBLICATION_POLICY',
    useValue: { resolve: async () => null } satisfies PublicationPolicyProvider,
  },
  {
    provide: 'RESULT_STEP_UP',
    useValue: { consume: async () => false } satisfies ResultStepUpVerifier,
  },
];
