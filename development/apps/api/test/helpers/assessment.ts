import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';

/**
 * Phase 7 slice 1 assessment-plan e2e helpers (TASK-PH7-001).
 * Wrappers over the assessment API plus the demo plan payload builder.
 * Follows the Phase 6 helper shape (sid cookie, x-requested-with header,
 * client-generated idempotency key per write).
 */
export const csrf = { 'x-requested-with': 'XMLHttpRequest' };
export const key = () => randomUUID();

export const OFFERING_REF = 'SWE-2026S1';
export const PERIOD_CODE = '2026S1';
export const SHELL_REF = 'SIM-SH-SWE-2026S1';

export function assessPost(app: INestApplication) {
  return (path: string, body: object, cookie: string) =>
    request(app.getHttpServer())
      .post(`/assessment${path}`)
      .set(csrf)
      .set('Cookie', cookie)
      .send(body);
}

export function assessGet(app: INestApplication) {
  return (path: string, cookie: string) =>
    request(app.getHttpServer()).get(`/assessment${path}`).set('Cookie', cookie);
}

/** Demo plan payload from ASSESSMENT-DEMO-v1 (fictional, SUP-009). */
export function mkPlan(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    offeringRef: OFFERING_REF,
    periodCode: PERIOD_CODE,
    components: [
      { code: 'CA-QUIZ1', maxMark: 20, weight: 20 },
      { code: 'CA-ASSIGN', maxMark: 30, weight: 20 },
      { code: 'FINAL-EXAM', maxMark: 100, weight: 60 },
    ],
    ...overrides,
  };
}

export function mkMapping(
  componentId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    componentId,
    moodleActivityId: 'SIM-QUIZ-CA1',
    moodleCourseRef: SHELL_REF,
    ...overrides,
  };
}
