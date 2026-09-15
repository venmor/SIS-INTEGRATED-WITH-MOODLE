import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { CsrfGuard } from './csrf.guard.js';
import { PrismaService } from './prisma.service.js';
import { RecoveryService } from './recovery.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [AuthController],
  providers: [PrismaService, SessionService, RecoveryService, SessionGuard, CsrfGuard],
  exports: [PrismaService, SessionService],
})
export class IdentityAccessModule {}
