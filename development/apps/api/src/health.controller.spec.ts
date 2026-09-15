import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [AppService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns the liveness shape', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok', version: '0.1.0' });
  });
});
