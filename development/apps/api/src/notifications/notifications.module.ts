import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsWorker } from './notifications.worker.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsWorker],
  exports: [NotificationsService],
})
export class NotificationsModule {}
