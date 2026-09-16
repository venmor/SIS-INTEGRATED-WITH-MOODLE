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
    // Audit failures must never turn a denial into a 500: the 403 stands
    // with or without its audit row (reference attached when available).
    let reference = '';
    try {
      const row = await auditAuth(this.prisma, {
        action: 'CMD-IAM-Guard',
        outcome: 'DENY',
        reason: 'csrf-missing',
        errorCategory: 'ERR-SEC',
      });
      reference = row.correlationId;
    } catch {
      // Denial stands regardless of audit availability.
    }
    throw new ForbiddenException({
      message: AUTH_MESSAGES.grantDenied.text,
      ...(reference ? { reference } : {}),
    });
  }
}
