import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { Prisma } from '@prisma/client';

export interface FailedDelivery {
  id: string;
  outboxId: string;
  eventType: string;
  aggregateId: string;
  state: string;
  attempt: number;
  nextRunAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DeliveryMetrics {
  queueDepth: number;
  successRate: number;
  deadLetterCount: number;
  manualReviewCount: number;
  avgAttempts: number;
  maxAttempts: number;
  avgLatencyMs: number;
}

export interface GetFailedDeliveriesFilters {
  eventType?: string;
  state?: 'DEAD_LETTER' | 'MANUAL_REVIEW';
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * Operations Queue Service (GAP-009).
 * Provides operational tooling for failed delivery attempts:
 * - List failed deliveries with filters and pagination
 * - Manual retry of failed deliveries
 * - Redirect delivery to a different channel
 * - Delivery metrics for monitoring
 */
@Injectable()
export class OperationsQueueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of failed deliveries (DEAD_LETTER or MANUAL_REVIEW)
   */
  async getFailedDeliveries(filters: GetFailedDeliveriesFilters = {}): Promise<PaginatedResult<FailedDelivery>> {
    const {
      eventType,
      state,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 20,
    } = filters;

    const where: Prisma.IntegrationDeliveryAttemptWhereInput = {
      state: { in: ['DEAD_LETTER', 'MANUAL_REVIEW'] },
    };

    if (state) {
      where.state = state;
    }

    if (eventType) {
      where.outbox = { type: eventType };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [items, total] = await Promise.all([
      this.prisma.integrationDeliveryAttempt.findMany({
        where,
        include: { outbox: { select: { id: true, type: true, aggregateId: true, payload: true, occurredAt: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.integrationDeliveryAttempt.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        outboxId: item.outboxId,
        eventType: item.outbox.type,
        aggregateId: item.outbox.aggregateId,
        state: item.state,
        attempt: item.attempt,
        nextRunAt: item.nextRunAt,
        lastError: item.lastError,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Manually retry a failed delivery by resetting its state to PENDING
   */
  async retryDelivery(deliveryAttemptId: string): Promise<{
    id: string;
    outboxId: string;
    state: string;
    attempt: number;
    nextRunAt: Date | null;
    lastError: string | null;
  }> {
    const attempt = await this.prisma.integrationDeliveryAttempt.findUnique({
      where: { id: deliveryAttemptId },
      include: { outbox: true },
    });

    if (!attempt) {
      throw new NotFoundException('Delivery attempt not found');
    }

    const updated = await this.prisma.integrationDeliveryAttempt.update({
      where: { id: deliveryAttemptId },
      data: {
        state: 'PENDING',
        attempt: 0,
        nextRunAt: new Date(),
        lastError: null,
      },
    });

    return {
      id: updated.id,
      outboxId: updated.outboxId,
      state: updated.state,
      attempt: updated.attempt,
      nextRunAt: updated.nextRunAt,
      lastError: updated.lastError,
    };
  }

  /**
   * Redirect a failed delivery to a different channel by updating the outbox payload
   */
  async redirectDelivery(deliveryAttemptId: string, newChannel: 'email' | 'sms' | 'internal' | 'webhook'): Promise<{
    id: string;
    outboxId: string;
    state: string;
    attempt: number;
    nextRunAt: Date | null;
    lastError: string | null;
  }> {
    const attempt = await this.prisma.integrationDeliveryAttempt.findUnique({
      where: { id: deliveryAttemptId },
      include: { outbox: true },
    });

    if (!attempt) {
      throw new NotFoundException('Delivery attempt not found');
    }

    // Update outbox payload with new channel configuration
    const currentPayload = (attempt.outbox.payload ?? {}) as Record<string, unknown>;
    const updatedPayload = {
      ...currentPayload,
      channels: [newChannel],
    };

    await this.prisma.outboxEvent.update({
      where: { id: attempt.outboxId },
      data: { payload: updatedPayload },
    });

    // Reset delivery attempt for retry
    const updated = await this.prisma.integrationDeliveryAttempt.update({
      where: { id: deliveryAttemptId },
      data: {
        state: 'PENDING',
        attempt: 0,
        nextRunAt: new Date(),
        lastError: null,
      },
    });

    return {
      id: updated.id,
      outboxId: updated.outboxId,
      state: updated.state,
      attempt: updated.attempt,
      nextRunAt: updated.nextRunAt,
      lastError: updated.lastError,
    };
  }

  /**
   * Get delivery metrics for monitoring
   */
  async getDeliveryMetrics(): Promise<DeliveryMetrics> {
    // Get counts by state
    const stateCounts = await this.prisma.integrationDeliveryAttempt.groupBy({
      by: ['state'],
      _count: { id: true },
    });

    const counts = Object.fromEntries(stateCounts.map((s) => [s.state, s._count.id]));
    const pending = counts.PENDING ?? 0;
    const delivering = counts.DELIVERING ?? 0;
    const delivered = counts.DELIVERED ?? 0;
    const retry = counts.RETRY ?? 0;
    const deadLetter = counts.DEAD_LETTER ?? 0;
    const manualReview = counts.MANUAL_REVIEW ?? 0;

    // Calculate queue depth (pending + delivering + retry)
    const queueDepth = pending + delivering + retry;

    // Calculate success rate
    const total = pending + delivering + delivered + retry + deadLetter + manualReview;
    const successRate = total > 0 ? delivered / total : 0;

    // Get attempt statistics
    const attemptStats = await this.prisma.integrationDeliveryAttempt.aggregate({
      _avg: { attempt: true },
      _max: { attempt: true },
    });

    // Calculate average latency for delivered events
    const deliveredAttempts = await this.prisma.integrationDeliveryAttempt.findMany({
      where: { state: 'DELIVERED', deliveredAt: { not: null } },
      select: { createdAt: true, deliveredAt: true },
      take: 1000,
    });

    let avgLatencyMs = 0;
    if (deliveredAttempts.length > 0) {
      const totalLatency = deliveredAttempts.reduce((sum, a) => {
        return sum + (a.deliveredAt!.getTime() - a.createdAt.getTime());
      }, 0);
      avgLatencyMs = totalLatency / deliveredAttempts.length;
    }

    return {
      queueDepth,
      successRate,
      deadLetterCount: deadLetter,
      manualReviewCount: manualReview,
      avgAttempts: attemptStats._avg.attempt ?? 0,
      maxAttempts: attemptStats._max.attempt ?? 0,
      avgLatencyMs,
    };
  }
}