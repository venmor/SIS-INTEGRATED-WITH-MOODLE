import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RecoveryReviewService } from './recovery-review.service.js';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { AUTH_MESSAGES } from '@sis/config';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

// Mock PrismaService
const createMockPrisma = () => {
  const mock = {
    recoveryReviewQueue: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    recoverySuspicion: {
      update: vi.fn(),
    },
    recoveryToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    roleAssignment: {
      findFirst: vi.fn(),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (fn) => fn(mock)),
  };
  return mock;
};

// Mock ConfigurationService
const createMockConfig = () => ({
  getOrThrow: vi.fn(),
});

describe('RecoveryReviewService (GAP-011)', () => {
  let reviewService: RecoveryReviewService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockConfig: ReturnType<typeof createMockConfig>;

  const mockActor = {
    accountId: 'admin-1',
    assignmentId: 'assign-1',
    activeRole: 'SYSADMIN',
    scope: 'SYSTEM:GLOBAL',
  };

  const mockQueueItem = {
    id: 'queue-1',
    suspicionId: 'suspicion-1',
    accountId: 'account-1',
    priority: 'HIGH',
    status: 'PENDING',
    assignedTo: null,
    createdAt: new Date(),
    suspicion: {
      id: 'suspicion-1',
      accountId: 'account-1',
      riskScore: 75,
      signalType: 'FAILED_ATTEMPTS',
      signalDetails: { signals: [] },
      status: 'QUEUED',
    },
    account: {
      id: 'account-1',
      username: 'testuser',
      personId: 'person-1',
    },
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockConfig = createMockConfig();

    // Default config - SYSADMIN is a review role
    mockConfig.getOrThrow.mockResolvedValue(['SYSADMIN', 'SECURITY_ADMIN']);

    // Default role assignment for hasActiveAuthority
    mockPrisma.roleAssignment.findFirst.mockResolvedValue({
      id: 'assign-1',
      accountId: 'admin-1',
      role: 'SYSADMIN',
      scopeType: 'SYSTEM',
      scopeRef: 'GLOBAL',
      startsAt: new Date(Date.now() - 86400000),
      revokedAt: null,
      endsAt: null,
      account: { status: 'ACTIVE' },
    });

    reviewService = new RecoveryReviewService(mockPrisma as any, mockConfig as any);
  });

  describe('getReviewQueue', () => {
    it('should return queue items for security admin', async () => {
      mockPrisma.recoveryReviewQueue.findMany.mockResolvedValue([mockQueueItem]);

      const result = await reviewService.getReviewQueue(mockActor, {});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('queue-1');
      expect(mockConfig.getOrThrow).toHaveBeenCalledWith('security.reviewRoles');
    });

    it('should throw ForbiddenException for non-security-admin', async () => {
      mockConfig.getOrThrow.mockResolvedValue(['SECURITY_ADMIN']);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);

      await expect(reviewService.getReviewQueue(mockActor, {})).rejects.toThrow(ForbiddenException);
    });

    it('should apply filters correctly', async () => {
      mockPrisma.recoveryReviewQueue.findMany.mockResolvedValue([]);

      await reviewService.getReviewQueue(mockActor, { status: 'CLAIMED', priority: 'HIGH' });

      expect(mockPrisma.recoveryReviewQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CLAIMED',
            priority: 'HIGH',
          }),
        })
      );
    });
  });

  describe('getReviewById', () => {
    it('should return queue item with suspicion details', async () => {
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(mockQueueItem);

      const result = await reviewService.getReviewById(mockActor, 'queue-1');

      expect(result.id).toBe('queue-1');
      expect(result.suspicion).toBeDefined();
      expect(result.account).toBeDefined();
    });

    it('should throw NotFoundException for unknown queue ID', async () => {
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(null);

      await expect(reviewService.getReviewById(mockActor, 'unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-security-admin', async () => {
      mockConfig.getOrThrow.mockResolvedValue(['SECURITY_ADMIN']);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);

      await expect(reviewService.getReviewById(mockActor, 'queue-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('decideReview', () => {
    it('should approve recovery and create new token', async () => {
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(mockQueueItem);
      mockPrisma.recoveryReviewQueue.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.recoveryReviewQueue.findUniqueOrThrow.mockResolvedValue(mockQueueItem);
      mockPrisma.recoveryReviewQueue.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'DECIDED',
        decidedAt: new Date(),
        decidedBy: 'admin-1',
        decision: 'APPROVE',
        decisionReason: 'Legitimate user verified',
      });
      mockPrisma.recoverySuspicion.update.mockResolvedValue({});
      mockPrisma.recoveryToken.create.mockResolvedValue({
        id: 'token-new',
        tokenHash: 'hash',
        accountId: 'account-1',
        expiresAt: new Date(),
      });
      mockPrisma.auditEvent.create.mockResolvedValue({});
      mockPrisma.outboxEvent.create.mockResolvedValue({});

      const result = await reviewService.decideReview(mockActor, 'queue-1', 'APPROVE', 'Legitimate user verified');

      expect(result.decision).toBe('APPROVE');
      expect(result.recoveryToken).toBeDefined();
      expect(mockPrisma.recoveryToken.create).toHaveBeenCalled();
    });

    it('should deny recovery and revoke existing tokens', async () => {
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(mockQueueItem);
      mockPrisma.recoveryReviewQueue.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.recoveryReviewQueue.findUniqueOrThrow.mockResolvedValue(mockQueueItem);
      mockPrisma.recoveryReviewQueue.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'DECIDED',
        decidedAt: new Date(),
        decidedBy: 'admin-1',
        decision: 'DENY',
        decisionReason: 'Confirmed fraudulent attempt',
      });
      mockPrisma.recoverySuspicion.update.mockResolvedValue({});
      mockPrisma.recoveryToken.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditEvent.create.mockResolvedValue({});
      mockPrisma.outboxEvent.create.mockResolvedValue({});

      const result = await reviewService.decideReview(mockActor, 'queue-1', 'DENY', 'Confirmed fraudulent attempt');

      expect(result.decision).toBe('DENY');
      expect(result.recoveryToken).toBeNull();
      expect(mockPrisma.recoveryToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: 'account-1', usedAt: null },
        })
      );
    });

    it('should escalate without creating token or revoking', async () => {
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(mockQueueItem);
      mockPrisma.recoveryReviewQueue.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.recoveryReviewQueue.findUniqueOrThrow.mockResolvedValue(mockQueueItem);
      mockPrisma.recoveryReviewQueue.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'DECIDED',
        decidedAt: new Date(),
        decidedBy: 'admin-1',
        decision: 'ESCALATE',
        decisionReason: 'Requires higher authority',
      });
      mockPrisma.recoverySuspicion.update.mockResolvedValue({});
      mockPrisma.auditEvent.create.mockResolvedValue({});
      mockPrisma.outboxEvent.create.mockResolvedValue({});

      const result = await reviewService.decideReview(mockActor, 'queue-1', 'ESCALATE', 'Requires higher authority');

      expect(result.decision).toBe('ESCALATE');
      expect(result.recoveryToken).toBeNull();
      expect(mockPrisma.recoveryToken.create).not.toHaveBeenCalled();
      expect(mockPrisma.recoveryToken.updateMany).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if already decided', async () => {
      const decidedQueue = { ...mockQueueItem, status: 'DECIDED' };
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(decidedQueue);

      await expect(reviewService.decideReview(mockActor, 'queue-1', 'APPROVE', 'Reason')).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException for self-review', async () => {
      const selfQueue = { ...mockQueueItem, accountId: 'admin-1' };
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(selfQueue);

      await expect(reviewService.decideReview(mockActor, 'queue-1', 'APPROVE', 'Reason')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if another admin claimed it', async () => {
      // First findUnique returns the pending queue item
      mockPrisma.recoveryReviewQueue.findUnique
        .mockResolvedValueOnce(mockQueueItem)
        // Second findUnique (recheck after updateMany fails) returns claimed by other admin
        .mockResolvedValueOnce({
          ...mockQueueItem,
          status: 'CLAIMED',
          assignedTo: 'other-admin',
        });
      mockPrisma.recoveryReviewQueue.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.recoveryReviewQueue.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'DECIDED',
        decidedAt: new Date(),
        decidedBy: 'admin-1',
        decision: 'APPROVE',
        decisionReason: 'Reason',
      });

      await expect(reviewService.decideReview(mockActor, 'queue-1', 'APPROVE', 'Reason')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for unknown queue ID', async () => {
      mockPrisma.recoveryReviewQueue.findUnique.mockResolvedValue(null);

      await expect(reviewService.decideReview(mockActor, 'unknown', 'APPROVE', 'Reason')).rejects.toThrow(NotFoundException);
    });
  });
});