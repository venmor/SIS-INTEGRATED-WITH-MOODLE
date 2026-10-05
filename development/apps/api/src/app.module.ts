import { AdmissionsModule } from './admissions/admissions.module.js';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health.controller.js';
import { IdentityAccessModule } from './identity-access/identity-access.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { RecordsModule } from './records/records.module.js';
import { RegistrationModule } from './registration/registration.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { TeachingModule } from './teaching/teaching.module.js';
import { IntegrationModule } from './integration/integration.module.js';
import { AssessmentModule } from './assessment/assessment.module.js';
import { InstitutionSetupModule } from './institution-setup/institution-setup.module.js';
import { TimetablingModule } from './timetabling/timetabling.module.js';
import { AcademicSupportModule } from './academic-support/academic-support.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    IdentityAccessModule,
    CatalogueModule,
    AdmissionsModule,
    RecordsModule,
    RegistrationModule,
    FinanceModule,
    TeachingModule,
    IntegrationModule,
    AssessmentModule,
    InstitutionSetupModule,
    TimetablingModule,
    AcademicSupportModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
