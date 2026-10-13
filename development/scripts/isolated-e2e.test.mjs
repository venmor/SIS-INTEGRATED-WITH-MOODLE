import test from 'node:test';
import assert from 'node:assert/strict';
import { assertIsolatedBaseline } from './isolated-e2e.mjs';
test('connected suites only clone an explicitly local isolated baseline', () => {
  assert.equal(assertIsolatedBaseline({DEMO_MODE:'true',DATABASE_URL:'postgresql://ci:ci@localhost:5432/sis_ci_review'}).hostname,'localhost');
  for (const DATABASE_URL of ['postgresql://ci:ci@cloud.example/sis_ci_review','postgresql://ci:ci@localhost/production','postgresql://ci:ci@localhost/sis_ci_review_extra/other']) {
    assert.throws(() => assertIsolatedBaseline({DEMO_MODE:'true',DATABASE_URL}));
  }
  assert.throws(() => assertIsolatedBaseline({DEMO_MODE:'false',DATABASE_URL:'postgresql://ci:ci@localhost/sis_ci_review'}));
});
test('connected baseline rejects driver connection overrides before connecting', () => {
  for (const query of ['host=elsewhere.example','port=1','dbname=production','database=production','service=external']) {
    assert.throws(() => assertIsolatedBaseline({DEMO_MODE:'true',DATABASE_URL:`postgresql://ci:ci@127.0.0.1/sis_ci_review?${query}`}));
  }
});
