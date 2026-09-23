import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { RecordsController } from './records.controller.js';
import { RecordsService } from './records.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
