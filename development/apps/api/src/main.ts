import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module.js';

type HttpHandler = (request: IncomingMessage, response: ServerResponse) => void;

let application: Promise<INestApplication> | undefined;

async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  // Vercel routes this single Nest function under /api. Keep local URLs such
  // as /health unchanged for the documented development command, while the
  // hosted API receives /api/health and /api/catalogue/... as Vercel expects.
  if (process.env.VERCEL) {
    app.setGlobalPrefix('api');
  }
  // Reject unknown/ill-typed payloads early on every route (07/02: reject
  // unknown fields on sensitive commands — whitelist strips nothing silently).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Client IPs come from Express (req.ip) with loopback proxies trusted.
  // Deployments behind additional proxies must extend this setting or all
  // clients collapse to the proxy IP in rate-limit keys and audit rows.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 'loopback');
  return app;
}

function getApplication(): Promise<INestApplication> {
  application ??= createApplication();
  return application;
}

async function bootstrap() {
  const app = await getApplication();
  // Web shell serves :3000 — API listens :3001 by default (override with PORT).
  // Lifecycle hooks let ScheduleModule stop cron jobs cleanly on shutdown.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}

// Vercel invokes the module's default export. Build Nest once per warm
// function, initialise it without opening a second HTTP listener, then pass
// the request to Express. Local `npm run dev:api` keeps the normal listener.
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const app = await getApplication();
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance() as HttpHandler;
  expressApp(request, response);
}

if (!process.env.VERCEL) {
  void bootstrap().catch((error: unknown) => {
    console.error('Failed to start SIS–Moodle API.', error);
    process.exitCode = 1;
  });
}
