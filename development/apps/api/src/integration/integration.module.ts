import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { OpsModule } from '../ops/ops.module.js';
import { IntegrationController } from './integration.controller.js';
import { IntegrationService } from './integration.service.js';
import { DeliveryWorker } from './delivery.worker.js';
import { OperationsQueueService } from './operations-queue.service.js';

@Module({
  imports: [IdentityAccessModule, OpsModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, DeliveryWorker, OperationsQueueService],
  exports: [IntegrationService, OperationsQueueService],
})
export class IntegrationModule {}
