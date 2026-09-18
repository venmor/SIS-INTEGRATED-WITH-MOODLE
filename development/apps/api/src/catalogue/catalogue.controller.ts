import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { auditAuth } from '../identity-access/audit.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { RateLimiter } from '../identity-access/rate-limit.js';
import { CatalogueService } from './catalogue.service.js';
import {
  CompareQuery,
  CreateGuidanceSessionBody,
  EvaluateGuidanceBody,
  SearchCatalogueQuery,
} from './dto.js';

interface ProxyRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
  status(code: number): unknown;
}

// Public catalogue routes (applicant journey Part 2). No session guard —
// reads are anonymous by design (REQ-ADM-001). Mutations carry CsrfGuard
// (house rule); abuse surface shares the catalogueSearch budget per IP.
@Controller('catalogue')
export class CatalogueController {
  constructor(
    private readonly catalogue: CatalogueService,
    private readonly prisma: PrismaService,
  ) {}

  private clientIp(request: ProxyRequest): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0];
    return (request.ip ?? first ?? 'unknown').trim();
  }

  private async enforceRateLimit(
    req: ProxyRequest,
    res: PassthroughResponse,
    action: string,
  ): Promise<void> {
    const ip = this.clientIp(req);
    const limit = this.catalogue.limiter.check(
      `catsearch:${ip}`,
      RateLimiter.catalogueSearchLimit().maxAttempts,
      RateLimiter.catalogueSearchLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action,
        outcome: 'DENY',
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Get('routes')
  async routes(
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    await this.enforceRateLimit(req, res, 'CMD-CAT-ListRoutes');
    return this.catalogue.routes();
  }
  @Get('programmes')
  async search(
    @Query() query: SearchCatalogueQuery,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    await this.enforceRateLimit(req, res, 'CMD-CAT-Search');
    return this.catalogue.search({
      q: query.q,
      school: query.school,
      level: query.level,
      mode: query.mode,
      campus: query.campus,
      intake: query.intake,
      route: query.route,
      availability: query.availability,
      skip: query.skip,
      take: query.take,
    });
  }

  @Get('offerings/:id')
  async detail(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    await this.enforceRateLimit(req, res, 'CMD-CAT-ViewOffering');
    const found = await this.catalogue.detail(id);
    if (!found) {
      throw new NotFoundException({
        message: 'Programme offering not found.',
      });
    }
    return found;
  }

  @Get('compare')
  async compare(
    @Query() query: CompareQuery,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    await this.enforceRateLimit(req, res, 'CMD-CAT-Compare');
    return this.catalogue.compare(query.ids.split(','));
  }

  @Post('guidance/sessions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(CsrfGuard)
  async createSession(
    @Body() body: CreateGuidanceSessionBody,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    await this.enforceRateLimit(req, res, 'CMD-CAT-StartGuidance');
    return this.catalogue.createSession(body.offeringId, body.routeCode);
  }

  @Post('guidance/evaluate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async evaluate(
    @Body() body: EvaluateGuidanceBody,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    await this.enforceRateLimit(req, res, 'CMD-CAT-EvaluateGuidance');
    return this.catalogue.evaluate(body.sessionId, body.facts);
  }
}
