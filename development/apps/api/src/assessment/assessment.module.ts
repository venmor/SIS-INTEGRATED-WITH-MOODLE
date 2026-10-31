import { PublicationController } from './publication.controller.js';
import { PublicationService } from './publication.service.js';
import { publicationProviders } from './publication-ports.js';
import { forwardRef, Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { IntegrationModule } from '../integration/integration.module.js';
import { MoodleGradeImportService } from './moodle-grade-import.service.js';
import { ResultPublicationSecurityController } from './result-release-security.controller.js';
import { ResultDemoPolicyService, ResultReleaseProofService } from './result-release-security.service.js';

@Module({
  imports: [IdentityAccessModule, NotificationsModule, forwardRef(() => IntegrationModule)],
  controllers: [AssessmentController, PublicationController, ResultPublicationSecurityController],
  providers: [
    AssessmentService,
    MoodleGradeImportService,
    PublicationService,
    ResultDemoPolicyService,
    ResultReleaseProofService,
    ...publicationProviders,
  ],
  exports: [AssessmentService],
})
export class AssessmentModule {}
