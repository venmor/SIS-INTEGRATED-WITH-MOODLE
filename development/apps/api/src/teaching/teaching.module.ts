import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { TeachingController } from './teaching.controller.js';
import { TeachingService } from './teaching.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [TeachingController],
  providers: [TeachingService],
  exports: [TeachingService],
})
export class TeachingModule {}
