import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
describe('configuration snapshots are real and bounded', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/sign-in')
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' })
      .expect(200);
  });
  afterAll(async () => app.close());
  it('records snapshot before claiming success and lists it on the static route', async () => {
    const db = app.get(PrismaService);
    const count = await db.configurationVersion.count();
    const response = await agent
      .post('/config/versions')
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ changeReason: 'Review demonstration snapshot' });
    expect(response.status).toBe(201);
    expect(await db.configurationVersion.count()).toBe(count + 1);
    const list = await agent.get('/config/versions').expect(200);
    expect(list.body.versions.map((v: { id: string }) => v.id)).toContain(
      response.body.id,
    );
  });
});
