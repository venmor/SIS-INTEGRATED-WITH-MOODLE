import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { OpsController } from './ops.controller.js';
import { OpsService } from './ops.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [OpsController],
  providers: [OpsService],
  exports: [OpsService],
})
export class OpsModule {}
