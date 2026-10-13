import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { InstitutionReadinessController } from './readiness.controller.js';
import { InstitutionReadinessService } from './readiness.service.js';
import { DemoUniversitySetupController } from './demo-university.controller.js';
import { DemoUniversitySetupService } from './demo-university.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [InstitutionReadinessController, DemoUniversitySetupController],
  providers: [InstitutionReadinessService, DemoUniversitySetupService],
})
export class InstitutionSetupModule {}
