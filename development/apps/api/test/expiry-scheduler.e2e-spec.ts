import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from '../src/app.module.js';
import { ConfigurationService } from '../src/identity-access/configuration.service.js';
import { ExpiryDaemonService } from '../src/identity-access/expiry-daemon.service.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-5 scheduler wiring proofs (TASK-PH1-005). Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// The expiry daemon must run on the NestJS scheduler (DI-managed, graceful
// shutdown) with its cadence driven by security.expiryCheckIntervalMinutes —
// never a frozen setInterval captured once at boot.
describe('expiry scheduler (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let registry: SchedulerRegistry;
  let config: ConfigurationService;
  let daemon: ExpiryDaemonService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    registry = app.get(SchedulerRegistry);
    config = app.get(ConfigurationService);
    daemon = app.get(ExpiryDaemonService);
    // Silence the module so PrismaService is reachable in typings below.
    void PrismaService;
  });

  afterAll(async () => {
    await app.close();
  }, 60000);

  it('registers the expiry-check job on the NestJS scheduler', () => {
    const job = registry.getCronJob('expiry-check');
    expect(job).toBeDefined();
    const next = job.nextDate().toJSDate().getTime();
    expect(next).toBeGreaterThan(Date.now());
    // Demo cadence is 1 minute: the next fire must land within ~70s.
    expect(next - Date.now()).toBeLessThan(70 * 1000);
  });

  it('reschedules when the configured interval changes, then restores it', async () => {
    const key = 'security.expiryCheckIntervalMinutes';
    const before = await config.getOrThrow<number>(key);
    expect(before).toBe(1);
    expect(daemon.getScheduleExpression()).toBe('*/1 * * * *');

    await config.update(key, 5, 'e2e-scheduler', 'prove reschedule');
    try {
      await daemon.resyncSchedule();
      // Deterministic proof: the registered expression follows config.
      expect(daemon.getScheduleExpression()).toBe('*/5 * * * *');
      const rescheduled = registry
        .getCronJob('expiry-check')
        .nextDate()
        .toJSDate()
        .getTime();
      expect(rescheduled).toBeGreaterThan(Date.now());
    } finally {
      await config.update(key, before, 'e2e-scheduler', 'restore cadence');
      await daemon.resyncSchedule();
    }
    expect(daemon.getScheduleExpression()).toBe('*/1 * * * *');
    const restored = registry
      .getCronJob('expiry-check')
      .nextDate()
      .toJSDate()
      .getTime();
    expect(restored - Date.now()).toBeLessThan(70 * 1000);
  });
});
