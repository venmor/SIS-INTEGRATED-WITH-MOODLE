import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import { FinanceModule } from '../finance/finance.module.js';
import { IntegrationModule } from '../integration/integration.module.js';

@Module({
  imports: [IdentityAccessModule, FinanceModule, IntegrationModule],
  controllers: [RegistrationController],
  providers: [RegistrationService],
})
export class RegistrationModule {}
