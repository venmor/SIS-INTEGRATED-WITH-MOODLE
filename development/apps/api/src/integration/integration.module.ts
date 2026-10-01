import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { IntegrationController } from './integration.controller.js';
import { IntegrationService } from './integration.service.js';
import { DeliveryWorker } from './delivery.worker.js';
import { OutboxDeliveryWorker } from './outbox-delivery.worker.js';
import { OperationsQueueService } from './operations-queue.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, DeliveryWorker, OutboxDeliveryWorker, OperationsQueueService],
  exports: [IntegrationService, OperationsQueueService],
})
export class IntegrationModule {}
