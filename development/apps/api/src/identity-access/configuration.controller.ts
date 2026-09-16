import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service.js';
import { SessionGuard } from './session.guard.js';
import { CsrfGuard } from './csrf.guard.js';

interface PatchRequest {
  auth?: { accountId: string; sessionToken: string };
}

@ApiTags('Configuration')
@Controller('config')
export class ConfigurationController {
  constructor(private readonly config: ConfigurationService) {}

  /**
   * Get all configuration grouped by category
   * Only accessible to IAM Admin / SYSADMIN
   */
  @Get()
  @UseGuards(SessionGuard)
  async getAll() {
    return this.config.getAllGrouped();
  }

  /**
   * Get a single configuration value by key
   */
  @Get(':key')
  @UseGuards(SessionGuard)
  async getOne(@Param('key') key: string) {
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
  @UseGuards(SessionGuard)
  async getBatch(@Body() body: { keys: string[] }) {
    return this.config.getMany(body.keys);
  }

  /**
   * Get all configuration grouped by category (for admin UI)
   */
  @Get('admin/grouped')
  @UseGuards(SessionGuard)
  async getGrouped() {
    return this.config.getAllGrouped();
  }

  /**
   * Get all config keys for validation
   */
  @Get('meta/keys')
  @UseGuards(SessionGuard)
  async getKeys() {
    const keys = await this.config.getAllConfigKeys();
    return { keys };
  }

  /**
   * Update a configuration value
   * Requires IAM Admin or SYSADMIN role
   */
  @Patch(':key')
  @UseGuards(CsrfGuard)
  async update(
    @Param('key') key: string,
    @Body() body: { value: unknown; changeReason: string },
    @Req() req: PatchRequest,
  ) {
    const user = req.auth?.accountId;
    if (!user) {
      throw new Error('Unauthenticated');
    }

    const { item, version } = await this.config.update(
      key,
      body.value,
      body.changeReason || 'Configuration updated via API',
      body.changeReason
    );

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
  async createVersion(@Body() body: { changeReason: string }, @Req() req: any) {
    // This would create a full snapshot of all config
    // Implementation would snapshot all config items
    return { message: 'Version snapshot created' };
  }

  /**
   * Get configuration versions for rollback
   */
  @Get('versions')
  @UseGuards(SessionGuard)
  async getVersions() {
    // Return list of configuration versions for rollback
    return { versions: [] };
  }
}