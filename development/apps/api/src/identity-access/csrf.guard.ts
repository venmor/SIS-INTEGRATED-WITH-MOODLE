import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Cookie-authenticated mutations require the proxy-set marker header.
// SameSite=Lax already blocks cross-site POST cookies; this is the second
// layer (07/02). No custom message — Nest's default "Forbidden" avoids
// inventing auth copy outside AUTH-* templates.
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = (request.method as string) ?? 'GET';
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
    if (request.headers?.['x-requested-with'] === 'XMLHttpRequest') return true;
    throw new ForbiddenException();
  }
}
