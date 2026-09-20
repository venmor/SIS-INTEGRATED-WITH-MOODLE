import { AdmissionsModule } from './admissions/admissions.module.js';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health.controller.js';
import { IdentityAccessModule } from './identity-access/identity-access.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    IdentityAccessModule,
    CatalogueModule,
    AdmissionsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
