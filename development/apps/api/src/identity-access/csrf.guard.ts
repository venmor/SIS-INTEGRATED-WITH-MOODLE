import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { auditAuth } from './audit.js';
import { PrismaService } from './prisma.service.js';

// Cookie-authenticated mutations require the proxy-set marker header.
// SameSite=Lax already blocks cross-site POST cookies; this is the second
// layer (07/02). Rejections are audited with a support reference and use the
// neutral template — never a bare "Forbidden" (§14.34 UI-ACCESS-001).
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = (request.method as string) ?? 'GET';
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
    if (request.headers?.['x-requested-with'] === 'XMLHttpRequest') return true;
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-Guard',
      outcome: 'DENY',
      reason: 'csrf-missing',
      errorCategory: 'ERR-SEC',
    });
    throw new ForbiddenException({ message: AUTH_MESSAGES.grantDenied.text, reference: correlationId });
  }
}
