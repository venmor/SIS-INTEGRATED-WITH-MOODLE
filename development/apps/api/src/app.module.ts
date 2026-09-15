import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health.controller.js';
import { IdentityAccessModule } from './identity-access/identity-access.module.js';

@Module({
  imports: [IdentityAccessModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
