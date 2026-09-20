import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import {
  ApplicationsController,
  ApplicationRateGuard,
} from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { DocumentScanner } from './scanner.js';
@Module({
  imports: [IdentityAccessModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, DocumentScanner, ApplicationRateGuard],
})
export class AdmissionsModule {}
