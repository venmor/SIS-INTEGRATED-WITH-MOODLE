import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Reject unknown/ill-typed payloads early on every route (07/02: reject
  // unknown fields on sensitive commands — whitelist strips nothing silently).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // Web shell serves :3000 — API listens :3001 by default (override with PORT).
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
