import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { CommandsController } from './commands.controller.js';
import { CsrfGuard } from './csrf.guard.js';
import { GrantsController } from './grants.controller.js';
import { GrantsService } from './grants.service.js';
import { IncidentMiddleware } from './incident.middleware.js';
import { PolicyService } from './policy.service.js';
import { PrismaService } from './prisma.service.js';
import { RecoveryService } from './recovery.service.js';
import { RecoveryReviewService } from './recovery-review.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { WorkspaceController } from './workspace.controller.js';
import { WorkspaceService } from './workspace.service.js';
import { ConfigurationController } from './configuration.controller.js';
import { ConfigurationService } from './configuration.service.js';
import { ReviewService } from './review.service.js';
import { BreakGlassService } from './break-glass.service.js';
import { ReinstateService } from './reinstate.service.js';
import { AuditTimelineService } from './audit-timeline.service.js';
import { ExpiryDaemonService } from './expiry-daemon.service.js';
// Task 1.2: New services
import { ContactVerificationService } from './contact-verification.service.js';
import { MFAService } from './mfa.service.js';
import { StepUpService } from './step-up.service.js';

@Module({
  controllers: [
    AuthController,
    WorkspaceController,
    GrantsController,
    CommandsController,
    ConfigurationController,
  ],
  providers: [
    PrismaService,
    SessionService,
    RecoveryService,
    RecoveryReviewService,
    WorkspaceService,
    GrantsService,
    PolicyService,
    SessionGuard,
    CsrfGuard,
    ConfigurationService,
    ReviewService,
    BreakGlassService,
    ReinstateService,
    AuditTimelineService,
    ExpiryDaemonService,
    // Task 1.2: New services
    ContactVerificationService,
    MFAService,
    StepUpService,
  ],
  exports: [
    SessionGuard,
    PrismaService,
    SessionService,
    WorkspaceService,
    PolicyService,
    ConfigurationService,
    CsrfGuard,
    // Task 1.2: Export new services for use in other modules
    ContactVerificationService,
    MFAService,
    StepUpService,
    RecoveryService,
    RecoveryReviewService,
  ],
})
export class IdentityAccessModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Incident store for §12.11 every-action audit (see request-context.ts).
    consumer
      .apply(IncidentMiddleware)
      .forRoutes(
        AuthController,
        WorkspaceController,
        GrantsController,
        CommandsController,
        ConfigurationController,
      );
  }
}
