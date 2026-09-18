import { Module } from '@nestjs/common';
import { CatalogueController } from './catalogue.controller.js';
import { CatalogueService } from './catalogue.service.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';

// Public programme catalogue (TASK-PH2-001). Imports IdentityAccessModule
// for the shared PrismaService singleton and CsrfGuard; owns no auth state.
@Module({
  imports: [IdentityAccessModule],
  controllers: [CatalogueController],
  providers: [CatalogueService],
})
export class CatalogueModule {}
