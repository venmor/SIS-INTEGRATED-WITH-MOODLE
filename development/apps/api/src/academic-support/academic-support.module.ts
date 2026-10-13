import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { AcademicSupportController } from './academic-support.controller.js';
import { AcademicSupportService } from './academic-support.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [AcademicSupportController],
  providers: [AcademicSupportService],
})
export class AcademicSupportModule {}
