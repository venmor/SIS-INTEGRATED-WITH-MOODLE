import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { DemoTimetableRulesController } from './demo-rules.controller.js';
import { DemoTimetableRulesService } from './demo-rules.service.js';
import { MasterPreviewController } from './master-preview.controller.js';
import { MasterPreviewService } from './master-preview.service.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [DemoTimetableRulesController, MasterPreviewController],
  providers: [DemoTimetableRulesService, MasterPreviewService],
})
export class TimetablingModule {}
