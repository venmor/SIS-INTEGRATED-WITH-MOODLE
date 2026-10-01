import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../identity-access/prisma.service.js';
import { OperationsQueueService } from './operations-queue.service.js';
import { vi } from 'vitest';

describe('OperationsQueueService E2E Integration', () => {
  let service: OperationsQueueService;
  let prisma: PrismaService;

  const mockPrisma = {
    integrationDeliveryAttempt: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    outboxEvent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationsQueueService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OperationsQueueService>(OperationsQueueService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getFailedDeliveries', () => {
    it('should return paginated failed deliveries with DEAD_LETTER and MANUAL_REVIEW', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          outboxId: 'outbox-1',
          state: 'DEAD_LETTER',
          attempt: 5,
          nextRunAt: null,
          lastError: 'Failed after 5 attempts',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          outbox: {
            id: 'outbox-1',
            type: 'ApplicationSubmitted',
            aggregateId: 'app-1',
            payload: {},
            occurredAt: new Date('2024-01-01'),
          },
        },
        {
          id: 'attempt-2',
          outboxId: 'outbox-2',
          state: 'MANUAL_REVIEW',
          attempt: 3,
          nextRunAt: null,
          lastError: 'Mapping error',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          outbox: {
            id: 'outbox-2',
            type: 'ClarificationRequested',
            aggregateId: 'app-2',
            payload: {},
            occurredAt: new Date('2024-01-02'),
          },
        },
      ];

      mockPrisma.integrationDeliveryAttempt.findMany.mockResolvedValue(mockAttempts);
      mockPrisma.integrationDeliveryAttempt.count.mockResolvedValue(2);

      const result = await service.getFailedDeliveries({});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].eventType).toBe('ApplicationSubmitted');
      expect(result.items[0].state).toBe('DEAD_LETTER');
      expect(result.items[1].eventType).toBe('ClarificationRequested');
      expect(result.items[1].state).toBe('MANUAL_REVIEW');
    });

    it('should filter by eventType', async () => {
      mockPrisma.integrationDeliveryAttempt.findMany.mockResolvedValue([]);
      mockPrisma.integrationDeliveryAttempt.count.mockResolvedValue(0);

      await service.getFailedDeliveries({ eventType: 'ApplicationSubmitted' });

      expect(mockPrisma.integrationDeliveryAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: { in: ['DEAD_LETTER', 'MANUAL_REVIEW'] },
            outbox: { type: 'ApplicationSubmitted' },
          }),
        })
      );
    });

    it('should filter by state', async () => {
      mockPrisma.integrationDeliveryAttempt.findMany.mockResolvedValue([]);
      mockPrisma.integrationDeliveryAttempt.count.mockResolvedValue(0);

      await service.getFailedDeliveries({ state: 'DEAD_LETTER' });

      expect(mockPrisma.integrationDeliveryAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: 'DEAD_LETTER',
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockPrisma.integrationDeliveryAttempt.findMany.mockResolvedValue([]);
      mockPrisma.integrationDeliveryAttempt.count.mockResolvedValue(100);

      const result = await service.getFailedDeliveries({ page: 2, pageSize: 10 });

      expect(mockPrisma.integrationDeliveryAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(100);
    });
  });

  describe('retryDelivery', () => {
    it('should reset attempt state to PENDING with nextRunAt = now', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        outboxId: 'outbox-1',
        state: 'DEAD_LETTER',
        attempt: 5,
        nextRunAt: new Date('2024-01-01'),
        lastError: 'Failed',
        outbox: { id: 'outbox-1', type: 'ApplicationSubmitted', payload: {} },
      };

      const updatedAttempt = {
        ...mockAttempt,
        state: 'PENDING',
        attempt: 0,
        nextRunAt: expect.any(Date),
        lastError: null,
      };

      mockPrisma.integrationDeliveryAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.integrationDeliveryAttempt.update.mockResolvedValue(updatedAttempt);

      const result = await service.retryDelivery('attempt-1');

      expect(result.state).toBe('PENDING');
      expect(result.attempt).toBe(0);
      expect(result.nextRunAt).toBeDefined();
      expect(result.lastError).toBeNull();
      expect(mockPrisma.integrationDeliveryAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({
          state: 'PENDING',
          attempt: 0,
          lastError: null,
        }),
      });
    });

    it('should throw if delivery attempt not found', async () => {
      mockPrisma.integrationDeliveryAttempt.findUnique.mockResolvedValue(null);

      await expect(service.retryDelivery('non-existent')).rejects.toThrow('Delivery attempt not found');
    });
  });

  describe('redirectDelivery', () => {
    it('should update outbox payload with new channel config and reset for retry', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        outboxId: 'outbox-1',
        state: 'DEAD_LETTER',
        attempt: 5,
        outbox: {
          id: 'outbox-1',
          type: 'ApplicationSubmitted',
          payload: { channels: ['email'], emailTo: 'test@example.com' },
        },
      };

      const updatedAttempt = {
        ...mockAttempt,
        state: 'PENDING',
        attempt: 0,
        nextRunAt: expect.any(Date),
        lastError: null,
      };

      mockPrisma.integrationDeliveryAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.integrationDeliveryAttempt.update.mockResolvedValue(updatedAttempt);
      mockPrisma.outboxEvent.update.mockResolvedValue({});

      const result = await service.redirectDelivery('attempt-1', 'sms');

      expect(result.state).toBe('PENDING');
      expect(result.attempt).toBe(0);
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'outbox-1' },
        data: { payload: expect.objectContaining({ channels: ['sms'] }) },
      });
    });

    it('should throw if delivery attempt not found', async () => {
      mockPrisma.integrationDeliveryAttempt.findUnique.mockResolvedValue(null);

      await expect(service.redirectDelivery('non-existent', 'sms')).rejects.toThrow('Delivery attempt not found');
    });
  });

  describe('getDeliveryMetrics', () => {
    it('should return queue depth, success rate, and latency', async () => {
      mockPrisma.integrationDeliveryAttempt.groupBy.mockResolvedValue([
        { state: 'PENDING', _count: { id: 5 } },
        { state: 'DELIVERING', _count: { id: 2 } },
        { state: 'DELIVERED', _count: { id: 100 } },
        { state: 'RETRY', _count: { id: 3 } },
        { state: 'DEAD_LETTER', _count: { id: 2 } },
        { state: 'MANUAL_REVIEW', _count: { id: 1 } },
      ]);

      mockPrisma.integrationDeliveryAttempt.aggregate.mockResolvedValue({
        _avg: { attempt: 1.5 },
        _max: { attempt: 5 },
      });

      mockPrisma.integrationDeliveryAttempt.findMany.mockResolvedValue([
        { deliveredAt: new Date('2024-01-01T10:00:05Z'), createdAt: new Date('2024-01-01T10:00:00Z') },
        { deliveredAt: new Date('2024-01-01T10:01:03Z'), createdAt: new Date('2024-01-01T10:01:00Z') },
      ]);

      const result = await service.getDeliveryMetrics();

      expect(result.queueDepth).toBe(10); // PENDING + DELIVERING + RETRY = 5 + 2 + 3
      expect(result.successRate).toBeCloseTo(100 / 113, 2);
      expect(result.deadLetterCount).toBe(2);
      expect(result.manualReviewCount).toBe(1);
      expect(result.avgAttempts).toBe(1.5);
      expect(result.maxAttempts).toBe(5);
      expect(result.avgLatencyMs).toBeGreaterThan(0);
    });

    it('should handle zero deliveries gracefully', async () => {
      mockPrisma.integrationDeliveryAttempt.groupBy.mockResolvedValue([]);
      mockPrisma.integrationDeliveryAttempt.aggregate.mockResolvedValue({
        _avg: { attempt: null },
        _max: { attempt: null },
      });
      mockPrisma.integrationDeliveryAttempt.findMany.mockResolvedValue([]);

      const result = await service.getDeliveryMetrics();

      expect(result.queueDepth).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.deadLetterCount).toBe(0);
      expect(result.manualReviewCount).toBe(0);
      expect(result.avgAttempts).toBe(0);
      expect(result.maxAttempts).toBe(0);
      expect(result.avgLatencyMs).toBe(0);
    });
  });
});