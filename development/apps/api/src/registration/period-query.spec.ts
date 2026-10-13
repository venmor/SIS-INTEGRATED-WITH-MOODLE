import 'reflect-metadata';
import { validate } from 'class-validator';
import { AmendmentQuery, PlanQuery, ReadinessQuery } from './dto.js';

describe('configured academic-period query identity', () => {
  for (const Query of [ReadinessQuery, PlanQuery, AmendmentQuery]) {
    it(`${Query.name} accepts the configured fictional publication period`, async () => {
      const value = Object.assign(new Query(), {
        period: 'DEMO-2026-PUBLICATION',
      });
      expect(await validate(value)).toHaveLength(0);
    });
    it(`${Query.name} keeps the period input bounded`, async () => {
      const value = Object.assign(new Query(), { period: 'X'.repeat(65) });
      expect(
        (await validate(value)).some((error) => error.property === 'period'),
      ).toBe(true);
    });
  }
});
