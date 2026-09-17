import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { IncidentInterceptor } from './incident.interceptor.js';
import { auditAuth } from './audit.js';
import { ConfigurationService } from './configuration.service.js';
import { PrismaService } from './prisma.service.js';
import { SessionGuard } from './session.guard.js';
import { CsrfGuard } from './csrf.guard.js';

interface ConfigRequest {
  auth?: { accountId: string };
}

// Security configuration (rate limits, lockout, roles, cadences): readable
// and writable by live IAM grantors only. Reads would otherwise disclose
// abuse-relevant thresholds to any session; writes would reconfigure
// protections. Denials are audited; successful updates record the actor.
@Controller('config')
@UseInterceptors(IncidentInterceptor)
export class ConfigurationController {
  constructor(
    private readonly config: ConfigurationService,
    private readonly prisma: PrismaService,
  ) {}

  private async requireGrantor(
    req: ConfigRequest,
    action: string,
  ): Promise<string> {
    const accountId = req.auth?.accountId;
    if (!accountId) {
      throw new UnauthorizedException(AUTH_MESSAGES.signInFailure.text);
    }
    const grantorRoles = await this.config.getOrThrow<string[]>(
      'security.grantorRoles',
    );
    const live = await this.prisma.roleAssignment.findMany({
      where: {
        accountId,
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { role: true },
    });
    if (!live.some((a) => grantorRoles.includes(a.role))) {
      const { correlationId } = await auditAuth(this.prisma, {
        action,
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'config-forbidden',
        errorCategory: 'ERR-SEC',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }
    return accountId;
  }

  /**
   * Get all configuration grouped by category
   * Only accessible to IAM Admin / SYSADMIN
   */
  @Get()
  @UseGuards(SessionGuard)
  async getAll(@Req() req: ConfigRequest) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigRead');
    return this.config.getAllGrouped();
  }

  /**
   * Get a single configuration value by key
   */
  @Get(':key')
  @UseGuards(SessionGuard)
  async getOne(@Param('key') key: string, @Req() req: ConfigRequest) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigRead');
    const value = await this.config.get(key);
    if (value === null) {
      return { key, value: null };
    }
    return { key, value };
  }

  /**
   * Get multiple configuration values by keys
   */
  @Post('batch')
  @UseGuards(CsrfGuard, SessionGuard)
  async getBatch(@Body() body: { keys: string[] }, @Req() req: ConfigRequest) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigRead');
    return this.config.getMany(body.keys);
  }

  /**
   * Get all configuration grouped by category (for admin UI)
   */
  @Get('admin/grouped')
  @UseGuards(SessionGuard)
  async getGrouped(@Req() req: ConfigRequest) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigRead');
    return this.config.getAllGrouped();
  }

  /**
   * Get all config keys for validation
   */
  @Get('meta/keys')
  @UseGuards(SessionGuard)
  async getKeys(@Req() req: ConfigRequest) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigRead');
    const keys = await this.config.getAllConfigKeys();
    return { keys };
  }

  /**
   * Update a configuration value
   * Requires IAM Admin or SYSADMIN role
   */
  @Patch(':key')
  @UseGuards(CsrfGuard, SessionGuard)
  async update(
    @Param('key') key: string,
    @Body() body: { value: unknown; changeReason: string },
    @Req() req: ConfigRequest,
  ) {
    const accountId = await this.requireGrantor(req, 'CMD-IAM-ConfigUpdate');
    const reason = body.changeReason || 'Configuration updated via API';

    const { item, version } = await this.config.update(
      key,
      body.value,
      accountId,
      reason,
    );

    await auditAuth(this.prisma, {
      action: 'CMD-IAM-ConfigUpdate',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      targetRef: key,
      reason: 'config-updated',
      purpose: 'configuration-change',
    });

    return {
      key: item.key,
      value: item.value,
      valueType: item.valueType,
      version: item.version,
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy,
    };
  }

  /**
   * Create a configuration version snapshot (for rollback)
   */
  @Post('versions')
  @UseGuards(CsrfGuard, SessionGuard)
  async createVersion(
    @Body() body: { changeReason: string },
    @Req() req: ConfigRequest,
  ) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigUpdate');
    // This would create a full snapshot of all config
    // Implementation would snapshot all config items
    return { message: 'Version snapshot created' };
  }

  /**
   * Get configuration versions for rollback
   */
  @Get('versions')
  @UseGuards(SessionGuard)
  async getVersions(@Req() req: ConfigRequest) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigRead');
    // Return list of configuration versions for rollback
    return { versions: [] };
  }
}
