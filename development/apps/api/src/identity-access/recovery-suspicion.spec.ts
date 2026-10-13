import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RecoveryService } from './recovery.service.js';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { AUTH_MESSAGES } from '@sis/config';

// Mock PrismaService
const createMockPrisma = () => {
  const mock = {
    account: {
      findUnique: vi.fn(),
    },
    recoveryMethod: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    recoveryToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
    },
    recoverySuspicion: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    recoveryReviewQueue: {
      create: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
    },
    credential: {
      updateMany: vi.fn(),
      create: vi.fn(),
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

describe('RecoveryService - Suspicion Detection (GAP-011)', () => {
  let recoveryService: RecoveryService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockConfig: ReturnType<typeof createMockConfig>;

  const mockAccount = {
    id: 'account-1',
    username: 'testuser',
    status: 'ACTIVE',
    recoveryMethods: [
      { id: 'method-1', type: 'EMAIL', valueHash: 'hash1', verifiedAt: new Date(), priority: 1 },
    ],
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockConfig = createMockConfig();

    // Default config for suspicion
    mockConfig.getOrThrow.mockResolvedValue({
      failedAttemptsThreshold: 3,
      failedAttemptsWindowMinutes: 60,
      geoAnomalyEnabled: true,
      geoAnomalyRiskScore: 30,
      deviceChangeEnabled: true,
      deviceChangeRiskScore: 25,
      rateLimitProximityThreshold: 80,
      rateLimitRiskScore: 20,
      riskScoreThreshold: 50,
      maxRiskScore: 100,
    });

    recoveryService = new RecoveryService(mockPrisma as any, mockConfig as any);
  });

  describe('checkSuspicionSignals', () => {
    it('should return zero risk score for new account with no history', async () => {
      mockPrisma.recoverySuspicion.count.mockResolvedValue(0);
      mockPrisma.session.findFirst.mockResolvedValue(null);
      mockPrisma.recoveryToken.count.mockResolvedValue(0);

      const result = await recoveryService.checkSuspicionSignals('account-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.riskScore).toBe(0);
      expect(result.signals).toHaveLength(0);
    });

    it('should detect failed attempts signal', async () => {
      mockPrisma.recoverySuspicion.count.mockResolvedValue(3); // At threshold
      mockPrisma.session.findFirst.mockResolvedValue(null);
      mockPrisma.recoveryToken.count.mockResolvedValue(0);

      const result = await recoveryService.checkSuspicionSignals('account-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.signals.some(s => s.type === 'FAILED_ATTEMPTS')).toBe(true);
    });

    it('should detect geo anomaly when IP subnet changes', async () => {
      mockPrisma.recoverySuspicion.count.mockResolvedValue(0);
      mockPrisma.session.findFirst.mockResolvedValue({
        createdIp: '10.0.0.50',
        createdAt: new Date(),
      });
      mockPrisma.recoveryToken.count.mockResolvedValue(0);

      const result = await recoveryService.checkSuspicionSignals('account-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.signals.some(s => s.type === 'GEO_ANOMALY')).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
    });

    it('should not detect geo anomaly when IP subnet is same', async () => {
      mockPrisma.recoverySuspicion.count.mockResolvedValue(0);
      mockPrisma.session.findFirst.mockResolvedValue({
        createdIp: '192.168.1.50',
        createdAt: new Date(),
      });
      mockPrisma.recoveryToken.count.mockResolvedValue(0);

      const result = await recoveryService.checkSuspicionSignals('account-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.signals.some(s => s.type === 'GEO_ANOMALY')).toBe(false);
    });

    it('should detect device change when user agent family differs', async () => {
      mockPrisma.recoverySuspicion.count.mockResolvedValue(0);
      mockPrisma.session.findFirst.mockResolvedValue({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        createdAt: new Date(),
      });
      mockPrisma.recoveryToken.count.mockResolvedValue(0);

      const result = await recoveryService.checkSuspicionSignals(
        'account-1',
        '192.168.1.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      );

      expect(result.signals.some(s => s.type === 'DEVICE_CHANGE')).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(25);
    });

    it('should not detect device change when user agent family is same', async () => {
      mockPrisma.recoverySuspicion.count.mockResolvedValue(0);
      mockPrisma.session.findFirst.mockResolvedValue({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        createdAt: new Date(),
      });
      mockPrisma.recoveryToken.count.mockResolvedValue(0);

      const result = await recoveryService.checkSuspicionSignals(
        'account-1',
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
      );

      expect(result.signals.some(s => s.type === 'DEVICE_CHANGE')).toBe(false);
    });

    it('should detect rate limit proximity', async () => {
      mockPrisma.recoverySuspicion.count.mockResolvedValue(0);
      mockPrisma.session.findFirst.mockResolvedValue(null);
      mockPrisma.recoveryToken.count.mockResolvedValue(3); // 3 attempts, limit is 3 with 80% threshold = 2.4

      const result = await recoveryService.checkSuspicionSignals('account-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.signals.some(s => s.type === 'RATE_LIMIT')).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
    });

    it('should cap risk score at maxRiskScore', async () => {
      mockConfig.getOrThrow.mockResolvedValue({
        failedAttemptsThreshold: 1,
        failedAttemptsWindowMinutes: 60,
        geoAnomalyEnabled: true,
        geoAnomalyRiskScore: 50,
        deviceChangeEnabled: true,
        deviceChangeRiskScore: 50,
        rateLimitProximityThreshold: 50,
        rateLimitRiskScore: 50,
        riskScoreThreshold: 50,
        maxRiskScore: 80,
      });

      mockPrisma.recoverySuspicion.count.mockResolvedValue(5); // Way over threshold
      mockPrisma.session.findFirst.mockResolvedValue({
        createdIp: '10.0.0.50',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        createdAt: new Date(),
      });
      mockPrisma.recoveryToken.count.mockResolvedValue(10); // Way over limit

      const result = await recoveryService.checkSuspicionSignals('account-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.riskScore).toBeLessThanOrEqual(80);
    });
  });

  describe('createSuspicionRecord', () => {
    it('should create suspicion record and queue for review when risk score exceeds threshold', async () => {
      mockConfig.getOrThrow.mockResolvedValue({
        riskScoreThreshold: 50,
      });

      mockPrisma.recoverySuspicion.create.mockResolvedValue({
        id: 'suspicion-1',
        accountId: 'account-1',
        riskScore: 75,
        status: 'QUEUED',
      });

      mockPrisma.recoveryReviewQueue.create.mockResolvedValue({
        id: 'queue-1',
        suspicionId: 'suspicion-1',
        status: 'PENDING',
      });

      const result = await recoveryService.createSuspicionRecord('account-1', 75, [
        { type: 'FAILED_ATTEMPTS', details: {} },
      ]);

      expect(result.suspicionId).toBe('suspicion-1');
      expect(result.queued).toBe(true);
      expect(mockPrisma.recoveryReviewQueue.create).toHaveBeenCalled();
    });

    it('should create suspicion record but not queue when risk score below threshold', async () => {
      mockConfig.getOrThrow.mockResolvedValue({
        riskScoreThreshold: 50,
      });

      mockPrisma.recoverySuspicion.create.mockResolvedValue({
        id: 'suspicion-2',
        accountId: 'account-1',
        riskScore: 25,
        status: 'PENDING',
      });

      const result = await recoveryService.createSuspicionRecord('account-1', 25, [
        { type: 'GEO_ANOMALY', details: {} },
      ]);

      expect(result.suspicionId).toBe('suspicion-2');
      expect(result.queued).toBe(false);
      expect(mockPrisma.recoveryReviewQueue.create).not.toHaveBeenCalled();
    });
  });

  describe('startRecovery with suspicion detection', () => {
    beforeEach(() => {
      // Mock checkSuspicionSignals to return configurable risk score
      vi.spyOn(recoveryService as any, 'checkSuspicionSignals').mockResolvedValue({
        riskScore: 75,
        signals: [{ type: 'FAILED_ATTEMPTS', details: { count: 3 } }],
      });
      vi.spyOn(recoveryService as any, 'createSuspicionRecord').mockResolvedValue({
        suspicionId: 'suspicion-1',
        queued: true,
      });
    });

    it('should pause recovery and return paused=true when suspicion queued', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await recoveryService.startRecovery('testuser', 'EMAIL', undefined, '192.168.1.1', 'Mozilla/5.0');

      expect(result.paused).toBe(true);
      expect(result.token).toBeUndefined();
      expect(result.message).toBe(AUTH_MESSAGES.recoveryRequested.text);
    });

    it('should proceed normally when no suspicion detected', async () => {
      vi.spyOn(recoveryService as any, 'checkSuspicionSignals').mockResolvedValue({
        riskScore: 10,
        signals: [],
      });
      vi.spyOn(recoveryService as any, 'createSuspicionRecord').mockResolvedValue({
        suspicionId: 'suspicion-2',
        queued: false,
      });

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);
      mockPrisma.recoveryToken.create.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        accountId: 'account-1',
        expiresAt: new Date(),
      });

      const result = await recoveryService.startRecovery('testuser', 'EMAIL', undefined, '192.168.1.1', 'Mozilla/5.0');

      expect(result.paused).toBeUndefined();
      expect(result.token).toBeDefined();
    });
  });
});