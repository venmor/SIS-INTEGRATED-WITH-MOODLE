import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';

@Module({
  imports: [IdentityAccessModule, NotificationsModule],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
