import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithIncident } from './request-context.js';

// Establishes the incident store at the HTTP edge: Express continues routing
// synchronously inside next(), so every downstream async resource (guards,
// interceptors, handlers, services) inherits this context. The incident
// interceptor fills in the value once SessionGuard has resolved authority.
@Injectable()
export class IncidentMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    runWithIncident(null, () => next());
  }
}
