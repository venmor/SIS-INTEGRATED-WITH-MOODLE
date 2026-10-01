import { PublicationController } from './publication.controller.js';
import { PublicationService } from './publication.service.js';
import { publicationProviders } from './publication-ports.js';
import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [AssessmentController, PublicationController],
  providers: [AssessmentService, PublicationService, ...publicationProviders],
  exports: [AssessmentService],
})
export class AssessmentModule {}
