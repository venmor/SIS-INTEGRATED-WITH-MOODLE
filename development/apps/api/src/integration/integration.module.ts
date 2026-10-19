import { MoodleDemoPasswordController, MoodleDemoPasswordService } from './moodle-demo-password.controller.js';
import { MoodleLiveRecoveryService } from './moodle-live-recovery.service.js';
import { MoodleLiveRecoveryController } from './moodle-live-recovery.controller.js';
import { MoodleLiveBindingsService } from './moodle-live-bindings.service.js';
import { MoodleLiveBindingsController } from './moodle-live-bindings.controller.js';
import { MoodleLiveRunController } from './moodle-live-run.controller.js';
import {
  MoodleLiveRunService,
  MoodleRunIdentityPort,
} from './moodle-live-run.service.js';
import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { OpsModule } from '../ops/ops.module.js';
import { IntegrationController } from './integration.controller.js';
import { IntegrationService } from './integration.service.js';
import { DeliveryWorker } from './delivery.worker.js';
import { MoodleLiveDeliveryService } from './moodle-live-delivery.service.js';
import { OperationsQueueService } from './operations-queue.service.js';

@Module({
  imports: [IdentityAccessModule, OpsModule],
  controllers: [
    IntegrationController,
    MoodleDemoPasswordController,
    MoodleLiveRunController,
    MoodleLiveBindingsController,
    MoodleLiveRecoveryController,
  ],
  providers: [
    IntegrationService,
    MoodleDemoPasswordService,
    MoodleLiveDeliveryService,
    MoodleLiveBindingsService,
    MoodleLiveRecoveryService,
    DeliveryWorker,
    OperationsQueueService,
    MoodleLiveRunService,
    MoodleRunIdentityPort,
  ],
  exports: [
    IntegrationService,
    OperationsQueueService,
    MoodleLiveRunService,
    MoodleLiveDeliveryService,
  ],
})
export class IntegrationModule {}
