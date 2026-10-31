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
import { forwardRef, Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { OpsModule } from '../ops/ops.module.js';
import { IntegrationController } from './integration.controller.js';
import { IntegrationService } from './integration.service.js';
import { DeliveryWorker } from './delivery.worker.js';
import { MoodleLiveDeliveryService } from './moodle-live-delivery.service.js';
import { OperationsQueueService } from './operations-queue.service.js';
import { MoodleProvisionService } from './moodle-provision.service.js';
import { MoodleProvisionController } from './moodle-provision.controller.js';
import { MoodleLaunchService } from './moodle-launch.service.js';
import { MoodleEntitlementService } from './moodle-entitlement.service.js';
import { MoodleLaunchConsumeController } from './moodle-launch.controller.js';
import { MoodleAccessSweepService } from './moodle-access-sweep.service.js';
import { MoodleGradeSyncService } from './moodle-grade-sync.service.js';
import { AssessmentModule } from '../assessment/assessment.module.js';

@Module({
  imports: [IdentityAccessModule, OpsModule, forwardRef(() => AssessmentModule)],
  controllers: [
    IntegrationController,
    MoodleDemoPasswordController,
    MoodleLiveRunController,
    MoodleLiveBindingsController,
    MoodleLiveRecoveryController,
    MoodleProvisionController,
    MoodleLaunchConsumeController,
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
    MoodleProvisionService,
    MoodleLaunchService,
    MoodleEntitlementService,
    MoodleAccessSweepService,
    MoodleGradeSyncService,
  ],
  exports: [
    IntegrationService,
    OperationsQueueService,
    MoodleLiveRunService,
    MoodleLiveDeliveryService,
    MoodleProvisionService,
    MoodleLaunchService,
  ],
})
export class IntegrationModule {}
