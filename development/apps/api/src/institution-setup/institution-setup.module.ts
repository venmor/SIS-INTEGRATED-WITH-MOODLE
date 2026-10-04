import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { InstitutionReadinessController } from './readiness.controller.js';
import { InstitutionReadinessService } from './readiness.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [InstitutionReadinessController],
  providers: [InstitutionReadinessService],
})
export class InstitutionSetupModule {}
