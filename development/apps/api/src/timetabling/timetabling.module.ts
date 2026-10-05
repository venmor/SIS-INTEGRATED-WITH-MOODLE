import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { DemoTimetableRulesController } from './demo-rules.controller.js';
import { DemoTimetableRulesService } from './demo-rules.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [DemoTimetableRulesController],
  providers: [DemoTimetableRulesService],
})
export class TimetablingModule {}
