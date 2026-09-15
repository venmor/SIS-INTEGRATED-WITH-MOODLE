import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { CommandsController } from './commands.controller.js';
import { CsrfGuard } from './csrf.guard.js';
import { GrantsController } from './grants.controller.js';
import { GrantsService } from './grants.service.js';
import { PolicyService } from './policy.service.js';
import { PrismaService } from './prisma.service.js';
import { RecoveryService } from './recovery.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { WorkspaceController } from './workspace.controller.js';
import { WorkspaceService } from './workspace.service.js';

@Module({
  controllers: [AuthController, WorkspaceController, GrantsController, CommandsController],
  providers: [
    PrismaService,
    SessionService,
    RecoveryService,
    WorkspaceService,
    GrantsService,
    PolicyService,
    SessionGuard,
    CsrfGuard,
  ],
  exports: [PrismaService, SessionService, WorkspaceService, PolicyService],
})
export class IdentityAccessModule {}
