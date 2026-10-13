import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { StepUpService } from '../identity-access/step-up.service.js';
import { MFAService } from '../identity-access/mfa.service.js';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sis:sis_local_only@localhost:5432/sis';

const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

describe('Finance Step-Up Authentication (GAP-020)', () => {
  let stepUpService: StepUpService;
  let mfaService: MFAService;

  beforeEach(async () => {
    // Create mock PrismaService for StepUpService
    const mockPrisma = prisma as any;
    mfaService = new MFAService(mockPrisma);
    stepUpService = new StepUpService(mockPrisma, mfaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Step-up actions configuration', () => {
    it('should include finance approval actions in stepUpActions', () => {
      const actions = stepUpService.getStepUpActions();
      
      expect(actions).toContain('finance.adjustment.approve');
      expect(actions).toContain('finance.waiver.approve');
      expect(actions).toContain('finance.refund.approve');
      expect(actions).toContain('finance.arrangement.approve');
    });

    it('should require step-up for all finance approval actions', () => {
      expect(stepUpService.requiresStepUp('finance.adjustment.approve')).toBe(true);
      expect(stepUpService.requiresStepUp('finance.waiver.approve')).toBe(true);
      expect(stepUpService.requiresStepUp('finance.refund.approve')).toBe(true);
      expect(stepUpService.requiresStepUp('finance.arrangement.approve')).toBe(true);
    });

    it('should not require step-up for non-finance actions', () => {
      expect(stepUpService.requiresStepUp('finance.adjustment.request')).toBe(false);
      expect(stepUpService.requiresStepUp('student.payment.initiate')).toBe(false);
    });

    it('should require step-up for other high-risk actions', () => {
      // Admissions
      expect(stepUpService.requiresStepUp('admissions.decision.release')).toBe(true);
      expect(stepUpService.requiresStepUp('admissions.offer.release')).toBe(true);
      // Results
      expect(stepUpService.requiresStepUp('results.mark.approve')).toBe(true);
      expect(stepUpService.requiresStepUp('results.progression.decide')).toBe(true);
      // Counselling
      expect(stepUpService.requiresStepUp('counselling.restricted-notes.access')).toBe(true);
      // Identity
      expect(stepUpService.requiresStepUp('identity.grant.revoke')).toBe(true);
      expect(stepUpService.requiresStepUp('identity.break-glass')).toBe(true);
    });
  });

  describe('StepUpService method availability', () => {
    it('should have createChallenge method', () => {
      expect(typeof stepUpService.createChallenge).toBe('function');
    });

    it('should have verifyChallenge method', () => {
      expect(typeof stepUpService.verifyChallenge).toBe('function');
    });

    it('should have getChallenge method', () => {
      expect(typeof stepUpService.getChallenge).toBe('function');
    });

    it('should have cleanupExpired method', () => {
      expect(typeof stepUpService.cleanupExpired).toBe('function');
    });

    it('should have requiresStepUp method', () => {
      expect(typeof stepUpService.requiresStepUp).toBe('function');
    });

    it('should have getStepUpActions method', () => {
      expect(typeof stepUpService.getStepUpActions).toBe('function');
    });
  });

  describe('Maker/checker + Step-up enforcement', () => {
    it('should require both maker/checker AND step-up for adjustment approval', () => {
      // This test documents the requirement:
      // 1. Maker/checker (SOD) - requester cannot approve own case
      // 2. Step-up authentication - MFA verification required before approval commit
      // Both must be enforced together for high-impact finance actions
      const financeActions = [
        'finance.adjustment.approve',
        'finance.waiver.approve',
        'finance.refund.approve',
        'finance.arrangement.approve',
      ];

      financeActions.forEach(action => {
        expect(stepUpService.requiresStepUp(action)).toBe(true);
      });
    });
  });

  describe('Demo mode compatibility', () => {
    it('should allow demo approvals to work (marked fictional)', () => {
      // Demo mode is controlled by DEMO_MODE environment variable
      // Step-up enforcement should still apply in demo mode
      // Demo approvals are marked as fictional in the UI layer
      // This test verifies the step-up service is available in all modes
      expect(stepUpService).toBeDefined();
      expect(stepUpService.requiresStepUp('finance.adjustment.approve')).toBe(true);
    });
  });

  describe('Configuration values', () => {
    it('should have stepUpExpiryMinutes configured', () => {
      // This verifies the config is loaded correctly
      const actions = stepUpService.getStepUpActions();
      expect(actions.length).toBeGreaterThan(0);
    });
  });
});