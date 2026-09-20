import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response, Request } from 'express';
import { APPLICATION_DEMO_V1 as policy } from '@sis/config';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { RateLimiter } from '../identity-access/rate-limit.js';
import { ApplicationsService } from './applications.service.js';
import {
  StartDto,
  SaveDto,
  ChangeDto,
  ConfirmDto,
  DocumentDto,
  SubmitDto,
  VersionDto,
} from './dto.js';
interface AuthRequest extends Request {
  auth: ActiveAuthority;
}
@Injectable()
export class ApplicationRateGuard implements CanActivate {
  private readonly limiter = new RateLimiter();
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    const limit = req.path.includes('documents')
      ? policy.rateLimit.documentsPerMinute
      : policy.rateLimit.generalPerMinute;
    const check = this.limiter.check(
      `${req.auth.accountId}:${req.path.includes('documents') ? 'file' : 'general'}`,
      limit,
      policy.rateLimit.windowMinutes,
    );
    if (!check.allowed) {
      res.setHeader('Retry-After', check.retryAfterSeconds);
      throw new HttpException(
        'Too many requests. Wait briefly before trying again.',
        429,
      );
    }
    return true;
  }
}
@Controller('applications')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}
  @Get('policy') async policy(@Req() r: AuthRequest) {
    await this.service.list(r.auth);
    return this.service.policy();
  }
  @Get() list(@Req() r: AuthRequest) {
    return this.service.list(r.auth);
  }
  @Get('commands/:key') result(
    @Req() r: AuthRequest,
    @Param('key', ParseUUIDPipe) key: string,
  ) {
    return this.service.result(r.auth, key);
  }
  @Get(':id') get(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(r.auth, id);
  }
  @Post() @UseGuards(CsrfGuard) start(
    @Req() r: AuthRequest,
    @Body() dto: StartDto,
  ) {
    return this.service.start(r.auth, dto);
  }
  @Post(':id/sections/:section') @UseGuards(CsrfGuard) save(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('section') section: string,
    @Body() dto: SaveDto,
  ) {
    if (!['personal', 'contact', 'qualifications'].includes(section))
      throw new BadRequestException('Unknown section.');
    return this.service.save(
      r.auth,
      id,
      section as 'personal' | 'contact' | 'qualifications',
      dto,
    );
  }
  @Post(':id/change-programme') @UseGuards(CsrfGuard) change(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeDto,
  ) {
    return this.service.change(r.auth, id, dto);
  }
  @Post(':id/discard') @UseGuards(CsrfGuard) discard(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmDto,
  ) {
    return this.service.discard(r.auth, id, dto);
  }
  @Post(':id/documents')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: policy.upload.maxBytes,
        files: 1,
        fields: 6,
        fieldSize: 1000,
      },
    }),
  )
  upload(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DocumentDto,
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      size: number;
      mimetype: string;
    },
  ) {
    return this.service.upload(r.auth, id, dto, file);
  }
  @Post(':id/documents/:docId/scan') @UseGuards(CsrfGuard) scan(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: VersionDto,
  ) {
    return this.service.scan(r.auth, id, docId, dto);
  }
  @Get(':id/documents/:docId/content') async content(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Res() res: Response,
  ) {
    const doc = await this.service.content(r.auth, id, docId);
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="document.${doc.mimeType === 'application/pdf' ? 'pdf' : doc.mimeType === 'image/png' ? 'png' : 'jpg'}"`,
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    res.send(Buffer.from(doc.content));
  }
  @Get(':id/review') review(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.review(r.auth, id);
  }
  @Post(':id/submit') @UseGuards(CsrfGuard) submit(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitDto,
  ) {
    return this.service.submit(r.auth, id, dto);
  }
  @Get(':id/receipt') receipt(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.receipt(r.auth, id);
  }
}
