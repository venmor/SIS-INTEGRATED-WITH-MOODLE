import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { setIncidentRef } from './request-context.js';

interface IncidentRequest {
  auth?: {
    accountId: string;
    scopeType?: string | null;
    scopeRef?: string | null;
  } | null;
}

// Fills the ambient incident once SessionGuard has set req.auth (guards run
// before interceptors). Plain passthrough otherwise: no Observable wrapping,
// no async-boundary tricks — the middleware owns the context lifetime.
@Injectable()
export class IncidentInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest() as IncidentRequest;
    const auth = request.auth;
    if (auth?.scopeType === 'BREAK_GLASS' && auth.scopeRef) {
      setIncidentRef(auth.scopeRef);
    }
    return next.handle();
  }
}
