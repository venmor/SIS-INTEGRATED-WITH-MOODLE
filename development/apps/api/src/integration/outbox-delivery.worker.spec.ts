import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OutboxDeliveryWorker } from './outbox-delivery.worker.js';
import { deliveryHandlerRegistry } from './delivery/delivery.handler.js';
import { IntegrationService } from './integration.service.js';
import { DeliveryHandler } from './delivery/delivery.handler.js';
import { vi } from 'vitest';

// Create mock handlers for testing
class MockEmailHandler implements DeliveryHandler {
  readonly name = 'email';
  private readonly supportedTypes = [
    'ApplicationSubmitted',
    'ClarificationRequested',
    'CorrectionRequested',
    'DecisionReleased',
    'OfferReleased',
    'WithdrawalConfirmed',
    'StudentConversion',
    'AssessmentAssigned',
  ];
  supports(eventType: string): boolean {
    return this.supportedTypes.includes(eventType);
  }
  getTarget(): null { return null; }
  async deliver(): Promise<never> { throw new Error('not implemented'); }
}

class MockSmsHandler implements DeliveryHandler {
  readonly name = 'sms';
  private readonly supportedTypes = [
    'ApplicationSubmitted',
    'ClarificationRequested',
    'CorrectionRequested',
    'DecisionReleased',
    'OfferReleased',
    'WithdrawalConfirmed',
    'StudentConversion',
    'AssessmentAssigned',
  ];
  supports(eventType: string): boolean {
    return this.supportedTypes.includes(eventType);
  }
  getTarget(): null { return null; }
  async deliver(): Promise<never> { throw new Error('not implemented'); }
}

class MockInternalHandler implements DeliveryHandler {
  readonly name = 'internal';
  private readonly supportedTypes = [
    'ApplicationSubmitted',
    'ClarificationRequested',
    'CorrectionRequested',
    'DecisionReleased',
    'OfferReleased',
    'WithdrawalConfirmed',
    'StudentConversion',
    'AssessmentAssigned',
  ];
  supports(eventType: string): boolean {
    return this.supportedTypes.includes(eventType);
  }
  getTarget(): null { return null; }
  async deliver(): Promise<never> { throw new Error('not implemented'); }
}

class MockWebhookHandler implements DeliveryHandler {
  readonly name = 'webhook';
  private readonly supportedTypes = [
    'ApplicationSubmitted',
    'ClarificationRequested',
    'CorrectionRequested',
    'DecisionReleased',
    'OfferReleased',
    'WithdrawalConfirmed',
    'StudentConversion',
    'AssessmentAssigned',
  ];
  supports(eventType: string): boolean {
    return this.supportedTypes.includes(eventType);
  }
  getTarget(): null { return null; }
  async deliver(): Promise<never> { throw new Error('not implemented'); }
}

describe('OutboxDeliveryWorker', () => {
  let worker: OutboxDeliveryWorker;
  let integrationService: IntegrationService;
  let scheduler: SchedulerRegistry & { addInterval: ReturnType<typeof vi.fn>; deleteInterval: ReturnType<typeof vi.fn> };

  const mockIntegrationService = {
    runWorker: vi.fn(),
  };

  const mockScheduler = {
    addInterval: vi.fn(),
    deleteInterval: vi.fn(),
  } as unknown as SchedulerRegistry & { addInterval: ReturnType<typeof vi.fn>; deleteInterval: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    deliveryHandlerRegistry['handlers'] = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxDeliveryWorker,
        { provide: IntegrationService, useValue: mockIntegrationService },
        { provide: SchedulerRegistry, useValue: mockScheduler },
      ],
    }).compile();

    worker = module.get<OutboxDeliveryWorker>(OutboxDeliveryWorker);
    integrationService = module.get<IntegrationService>(IntegrationService);
    scheduler = mockScheduler as typeof scheduler;

    // Register mock handlers
    deliveryHandlerRegistry.register(new MockEmailHandler());
    deliveryHandlerRegistry.register(new MockSmsHandler());
    deliveryHandlerRegistry.register(new MockInternalHandler());
    deliveryHandlerRegistry.register(new MockWebhookHandler());
  });

  describe('onModuleInit', () => {
    it('should register cron job with interval from policy', () => {
      worker.onModuleInit();

      expect(mockScheduler.addInterval).toHaveBeenCalled();
      const [name, timer] = mockScheduler.addInterval.mock.calls[0];
      expect(name).toBe('outbox-delivery');
      expect(timer).toBeDefined();
    });

    it('should skip cron registration on Vercel', () => {
      const originalVercel = process.env.VERCEL;
      process.env.VERCEL = 'true';

      const newWorker = new OutboxDeliveryWorker(mockScheduler, integrationService);
      newWorker.onModuleInit();

      expect(mockScheduler.addInterval).not.toHaveBeenCalled();

      process.env.VERCEL = originalVercel;
    });
  });

  describe('onModuleDestroy', () => {
    it('should delete the interval', () => {
      worker.onModuleDestroy();

      expect(mockScheduler.deleteInterval).toHaveBeenCalledWith('outbox-delivery');
    });

    it('should not throw if interval was never started', () => {
      const newWorker = new OutboxDeliveryWorker(mockScheduler, integrationService);
      expect(() => newWorker.onModuleDestroy()).not.toThrow();
    });
  });

  describe('processOutbox', () => {
    it('should process pending outbox events and call runWorker', async () => {
      mockIntegrationService.runWorker.mockResolvedValue({
        processed: 2,
        delivered: 2,
        retried: 0,
        dead: 0,
      });

      await worker.processOutbox();

      expect(mockIntegrationService.runWorker).toHaveBeenCalledWith(25);
    });

    it('should not process events if already running', async () => {
      mockIntegrationService.runWorker.mockResolvedValue({
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
      });

      // First call sets running = true
      const promise1 = worker.processOutbox();
      // Second call should return early
      const result2 = await worker.processOutbox();

      await promise1;

      expect(result2).toEqual({ processed: 0, delivered: 0, retried: 0, dead: 0 });
    });
  });

  describe('delivery handler integration', () => {
    it('should have handlers registered for non-Moodle event types', () => {
      const handler = deliveryHandlerRegistry.getHandler('ApplicationSubmitted');
      expect(handler).toBeDefined();
      expect(handler?.name).toBe('email');
    });

    it('should have handlers for registered event types', () => {
      const eventTypes = [
        'ApplicationSubmitted',
        'ClarificationRequested',
        'CorrectionRequested',
        'DecisionReleased',
        'OfferReleased',
        'WithdrawalConfirmed',
        'StudentConversion',
        'AssessmentAssigned',
      ];

      // Only check event types that have mock handlers registered
      const registeredTypes = ['ApplicationSubmitted', 'ClarificationRequested', 'CorrectionRequested', 'DecisionReleased', 'OfferReleased', 'WithdrawalConfirmed', 'StudentConversion', 'AssessmentAssigned'];
      
      for (const eventType of registeredTypes) {
        const handler = deliveryHandlerRegistry.getHandler(eventType);
        expect(handler).toBeDefined();
        expect(handler?.name).toBeTruthy();
      }
    });
  });
});