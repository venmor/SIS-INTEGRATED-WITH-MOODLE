import { createHash, randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { SECURITY_V1 } from '@sis/config';
import { auditAuth } from './audit.js';
import { generateSecret, generateURI, verifySync } from 'otplib';

/**
 * MFAService handles TOTP enrollment, verification, and backup codes for staff accounts.
 * Secrets and backup codes are encrypted at rest using AES-256-GCM.
 */
@Injectable()
export class MFAService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get encryption key from environment or derive from a secret
   */
  private getEncryptionKey(): Buffer {
    const secret = process.env.MFA_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    return scryptSync(secret, 'salt', 32);
  }

  /**
   * Encrypt sensitive data at rest using AES-256-GCM
   */
  private encrypt(data: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Combine iv + authTag + encrypted data
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(data: string): string {
    const key = this.getEncryptionKey();
    const buffer = Buffer.from(data, 'base64');
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  /**
   * Generate a TOTP secret and return the secret + QR code URI
   */
  async generateTOTPSecret(accountId: string, username: string): Promise<{ secret: string; otpauthUri: string }> {
    // Check if MFA already enrolled
    const existing = await this.prisma.mFAEnrollment.findUnique({ where: { accountId } });
    if (existing && !existing.disabledAt) {
      throw new Error('MFA already enrolled for this account');
    }

    const secret = generateSecret();
    const otpauthUri = generateURI({
      issuer: SECURITY_V1.mfaTotpIssuer,
      label: username,
      secret,
    });

    return { secret, otpauthUri };
  }

  /**
   * Enroll TOTP for an account (staff only).
   * Caller must verify the TOTP code before this is called.
   */
  async enrollTOTP(accountId: string, secret: string): Promise<{ reference: string }> {
    const secretEncrypted = this.encrypt(secret);

    await this.prisma.mFAEnrollment.upsert({
      where: { accountId },
      create: {
        accountId,
        type: 'TOTP',
        secretEncrypted,
      },
      update: {
        type: 'TOTP',
        secretEncrypted,
        disabledAt: null, // Re-enable if previously disabled
      },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-EnrollMFA',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: 'totp-enrolled',
    });

    return { reference: correlationId };
  }

  verifyEnrollmentCode(secret: string, code: string): boolean {
    try {
      return verifySync({ secret, token: code }).valid;
    } catch {
      return false;
    }
  }

  /**
   * Verify a TOTP code for an enrolled account
   */
  async verifyTOTP(accountId: string, code: string): Promise<{ ok: boolean; reference: string; message?: string }> {
    const enrollment = await this.prisma.mFAEnrollment.findUnique({ where: { accountId } });

    if (!enrollment || enrollment.disabledAt || !enrollment.secretEncrypted) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-VerifyMFA',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'mfa-not-enrolled',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'MFA not enrolled' };
    }

    const secret = this.decrypt(enrollment.secretEncrypted);
    const result = verifySync({ secret, token: code });
    const isValid = result.valid;

    if (!isValid) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-VerifyMFA',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'invalid-totp-code',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Invalid TOTP code' };
    }

    // Update last used timestamp
    await this.prisma.mFAEnrollment.update({
      where: { accountId },
      data: { lastUsedAt: new Date() },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-VerifyMFA',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: 'totp-verified',
    });

    return { ok: true, reference: correlationId };
  }

  /**
   * Generate backup codes for an enrolled account
   */
  async generateBackupCodes(accountId: string): Promise<{ codes: string[]; reference: string }> {
    const enrollment = await this.prisma.mFAEnrollment.findUnique({ where: { accountId } });

    if (!enrollment || enrollment.disabledAt) {
      throw new Error('MFA not enrolled');
    }

    const codes: string[] = [];
    const codeLength = SECURITY_V1.mfaBackupCodeLength;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars

    for (let i = 0; i < SECURITY_V1.mfaBackupCodesCount; i++) {
      let code = '';
      for (let j = 0; j < codeLength; j++) {
        code += chars[randomBytes(1)[0] % chars.length];
      }
      // Format as XXXX-XXXX for readability
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    // Hash each code for storage
    const hashedCodes = codes.map((code) => createHash('sha256').update(code).digest('hex'));
    const backupCodesEncrypted = this.encrypt(JSON.stringify(hashedCodes));

    await this.prisma.mFAEnrollment.update({
      where: { accountId },
      data: { backupCodesEncrypted, type: 'BACKUP_CODES' },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-GenerateBackupCodes',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: 'backup-codes-generated',
    });

    return { codes, reference: correlationId };
  }

  /**
   * Verify a backup code (single-use)
   */
  async verifyBackupCode(accountId: string, code: string): Promise<{ ok: boolean; reference: string; message?: string }> {
    const enrollment = await this.prisma.mFAEnrollment.findUnique({ where: { accountId } });

    if (!enrollment || enrollment.disabledAt || !enrollment.backupCodesEncrypted) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-VerifyMFA',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'no-backup-codes',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'No backup codes available' };
    }

    const storedHashes: string[] = JSON.parse(this.decrypt(enrollment.backupCodesEncrypted));
    const normalized = code.replace(/-/g, '').toUpperCase();
    const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
    const codeHash = createHash('sha256').update(formatted).digest('hex');

    const index = storedHashes.indexOf(codeHash);
    if (index === -1) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-VerifyMFA',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'invalid-backup-code',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Invalid backup code' };
    }

    // Remove the used code (single-use)
    storedHashes.splice(index, 1);
    const updatedEncrypted = this.encrypt(JSON.stringify(storedHashes));

    await this.prisma.mFAEnrollment.update({
      where: { accountId },
      data: { backupCodesEncrypted: updatedEncrypted, lastUsedAt: new Date() },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-VerifyMFA',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: 'backup-code-verified',
    });

    return { ok: true, reference: correlationId };
  }

  /**
   * Disable MFA for an account (requires TOTP or backup code verification)
   */
  async disableMFA(accountId: string, verificationCode: string, codeType: 'TOTP' | 'BACKUP_CODE'): Promise<{ reference: string }> {
    let verified = false;

    if (codeType === 'TOTP') {
      const result = await this.verifyTOTP(accountId, verificationCode);
      verified = result.ok;
    } else {
      const result = await this.verifyBackupCode(accountId, verificationCode);
      verified = result.ok;
    }

    if (!verified) {
      throw new Error('MFA verification failed');
    }

    await this.prisma.mFAEnrollment.update({
      where: { accountId },
      data: { disabledAt: new Date() },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-DisableMFA',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: 'mfa-disabled',
    });

    return { reference: correlationId };
  }

  /**
   * Check if MFA is enrolled and enabled for an account
   */
  async isMFAEnabled(accountId: string): Promise<boolean> {
    const enrollment = await this.prisma.mFAEnrollment.findUnique({ where: { accountId } });
    return !!enrollment && !enrollment.disabledAt;
  }

  /**
   * Get MFA enrollment status
   */
  async getMFAStatus(accountId: string): Promise<{ enrolled: boolean; type: string | null; lastUsedAt: Date | null; hasBackupCodes: boolean }> {
    const enrollment = await this.prisma.mFAEnrollment.findUnique({ where: { accountId } });

    if (!enrollment || enrollment.disabledAt) {
      return { enrolled: false, type: null, lastUsedAt: null, hasBackupCodes: false };
    }

    return {
      enrolled: true,
      type: enrollment.type,
      lastUsedAt: enrollment.lastUsedAt,
      hasBackupCodes: !!enrollment.backupCodesEncrypted,
    };
  }
}
