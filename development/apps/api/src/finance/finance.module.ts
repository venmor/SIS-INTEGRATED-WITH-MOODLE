import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { FinanceController } from './finance.controller.js';
import { FinanceCallbackController } from './finance-callback.controller.js';
import { FinanceService } from './finance.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [FinanceController, FinanceCallbackController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
