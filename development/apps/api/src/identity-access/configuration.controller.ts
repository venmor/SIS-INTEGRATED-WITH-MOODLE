import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { IncidentInterceptor } from './incident.interceptor.js';
import { auditAuth } from './audit.js';
import {
  hasActiveAuthority,
  type ActiveAuthority,
} from './active-authority.js';
import { ConfigurationService } from './configuration.service.js';
import { PrismaService } from './prisma.service.js';
import { SessionGuard } from './session.guard.js';
import { CsrfGuard } from './csrf.guard.js';

interface ConfigRequest {
  auth?: ActiveAuthority;
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
    if (
      !req.auth ||
      !(await hasActiveAuthority(this.prisma, req.auth, grantorRoles))
    ) {
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

    const { item } = await this.config.update(
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

  /** Persist the snapshot and audit together; never report an unperformed action. */
  @Post('versions')
  @UseGuards(CsrfGuard, SessionGuard)
  async createVersion(
    @Body() body: { changeReason: string },
    @Req() req: ConfigRequest,
  ) {
    const accountId = await this.requireGrantor(req, 'CMD-IAM-ConfigSnapshot');
    if (
      !body ||
      Object.keys(body).some((k) => k !== 'changeReason') ||
      typeof body.changeReason !== 'string' ||
      body.changeReason.trim().length < 8 ||
      body.changeReason.length > 500
    )
      throw new BadRequestException('Provide a reason of 8 to 500 characters.');
    return this.prisma.$transaction(async (tx) => {
      const items = await tx.configurationItem.findMany({
        where: { isSecret: false },
        orderBy: { key: 'asc' },
      });
      const snapshot = await tx.configurationVersion.create({
        data: {
          snapshot: Object.fromEntries(
            items.map((i) => [i.key, { value: i.value, version: i.version }]),
          ),
          changedBy: accountId,
          changeReason: body.changeReason.trim(),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorAccountId: accountId,
          activeRole: req.auth!.activeRole,
          scope: req.auth!.scope,
          action: 'CMD-IAM-ConfigSnapshot',
          targetRef: snapshot.id,
          outcome: 'ALLOW',
          correlationId: crypto.randomUUID(),
          purpose: 'configuration-change',
          reason: body.changeReason.trim(),
        },
      });
      return { id: snapshot.id, createdAt: snapshot.createdAt };
    });
  }

  @Get('versions')
  @UseGuards(SessionGuard)
  async getVersions(@Req() req: ConfigRequest) {
    await this.requireGrantor(req, 'CMD-IAM-ConfigRead');
    return {
      versions: await this.prisma.configurationVersion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          changedBy: true,
          changeReason: true,
        },
      }),
    };
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
}
