import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { SECURITY_V1 } from '@sis/config';
import { auditAuth } from './audit.js';

/**
 * ContactVerificationService handles email/SMS verification for self-registration
 * and contact updates. Codes are single-use, time-limited, and rate-limited.
 * Only the code hash is stored (never the raw code).
 */
@Injectable()
export class ContactVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a random numeric verification code
   */
  private generateCode(): string {
    const length = SECURITY_V1.contactVerificationCodeLength;
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[randomBytes(1)[0] % digits.length];
    }
    return code;
  }

  /**
   * Hash a verification code for storage
   */
  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Send a verification code to the specified contact.
   * In production, this would integrate with an email/SMS provider.
   * For now, the code is returned for demo/testing purposes.
   */
  async sendCode(
    personId: string,
    contactType: 'EMAIL' | 'PHONE',
    contactValue: string,
    ipAddress?: string,
  ): Promise<{ code: string; expiresAt: Date; reference: string }> {
    // Rate limiting: check recent attempts for this person+contact
    const recentAttempts = await this.prisma.contactVerification.count({
      where: {
        personId,
        contactType,
        contactValue,
        createdAt: {
          gte: new Date(Date.now() - SECURITY_V1.rateLimits.contactVerification.windowMinutes * 60 * 1000),
        },
      },
    });

    if (recentAttempts >= SECURITY_V1.rateLimits.contactVerification.maxAttempts) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SendVerificationCode',
        outcome: 'DENY',
        targetRef: `${contactType}:${contactValue}`,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      throw new Error(`Too many verification requests. Reference: ${correlationId}`);
    }

    // Invalidate any existing unverified codes for this contact
    await this.prisma.contactVerification.updateMany({
      where: {
        personId,
        contactType,
        contactValue,
        verifiedAt: null,
      },
      data: {
        verifiedAt: new Date(), // Mark as "used" (superseded)
      },
    });

    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + SECURITY_V1.contactVerificationExpiryMinutes * 60 * 1000);

    await this.prisma.contactVerification.create({
      data: {
        personId,
        contactType,
        contactValue,
        codeHash,
        expiresAt,
      },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-SendVerificationCode',
      outcome: 'ALLOW',
      targetRef: `${contactType}:${contactValue}`,
      reason: 'code-sent',
    });

    // In production, send via email/SMS provider here
    // For demo/testing, return the code
    return { code, expiresAt, reference: correlationId };
  }

  /**
   * Verify a code for the specified contact.
   * Returns verification result with personId if successful.
   */
  async verifyCode(
    personId: string,
    contactType: 'EMAIL' | 'PHONE',
    contactValue: string,
    code: string,
  ): Promise<{ ok: boolean; personId?: string; reference: string; message?: string }> {
    const codeHash = this.hashCode(code);

    const verification = await this.prisma.contactVerification.findFirst({
      where: {
        personId,
        contactType,
        contactValue,
        codeHash,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      // Check if there's a record with too many attempts
      const attemptRecord = await this.prisma.contactVerification.findFirst({
        where: {
          personId,
          contactType,
          contactValue,
          verifiedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (attemptRecord && attemptRecord.attempts >= SECURITY_V1.contactVerificationMaxAttempts) {
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-VerifyContact',
          outcome: 'DENY',
          targetRef: `${contactType}:${contactValue}`,
          reason: 'max-attempts-exceeded',
          errorCategory: 'ERR-SEC',
        });
        return { ok: false, reference: correlationId, message: 'Too many failed attempts. Request a new code.' };
      }

      // Increment attempts
      if (attemptRecord) {
        await this.prisma.contactVerification.update({
          where: { id: attemptRecord.id },
          data: { attempts: { increment: 1 } },
        });
      }

      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-VerifyContact',
        outcome: 'DENY',
        targetRef: `${contactType}:${contactValue}`,
        reason: 'invalid-or-expired-code',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Invalid or expired verification code.' };
    }

    // Mark as verified
    await this.prisma.contactVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() },
    });

    // If this is a person's email/phone, update the Person record
    if (contactType === 'EMAIL') {
      await this.prisma.person.update({
        where: { id: personId },
        data: { email: contactValue, emailVerifiedAt: new Date() },
      });
    } else if (contactType === 'PHONE') {
      await this.prisma.person.update({
        where: { id: personId },
        data: { phone: contactValue, phoneVerifiedAt: new Date() },
      });
    }

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-VerifyContact',
      outcome: 'ALLOW',
      actorAccountId: undefined,
      targetRef: `${contactType}:${contactValue}`,
      reason: 'contact-verified',
    });

    return { ok: true, personId, reference: correlationId };
  }

  /**
   * Check if a contact is already verified for a person
   */
  async isVerified(personId: string, contactType: 'EMAIL' | 'PHONE', contactValue: string): Promise<boolean> {
    const verification = await this.prisma.contactVerification.findFirst({
      where: {
        personId,
        contactType,
        contactValue,
        verifiedAt: { not: null },
      },
    });
    return !!verification;
  }

  /**
   * Clean up expired unverified codes (can be run as a scheduled job)
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.contactVerification.deleteMany({
      where: {
        verifiedAt: null,
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}