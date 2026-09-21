import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import {
  ApplicationsController,
  ApplicationRateGuard,
} from './applications.controller.js';
import { ApplicationCaseController } from './case.controller.js';
import { ReviewController } from './review.controller.js';
import { ApplicationsService } from './applications.service.js';
import { ApplicationCaseService } from './case.service.js';
import { ReviewService } from './review.service.js';
import { DocumentScanner } from './scanner.js';
@Module({
  imports: [IdentityAccessModule],
  controllers: [
    ReviewController,
    ApplicationCaseController,
    ApplicationsController,
  ],
  providers: [
    ApplicationsService,
    ApplicationCaseService,
    ReviewService,
    DocumentScanner,
    ApplicationRateGuard,
  ],
})
export class AdmissionsModule {}
