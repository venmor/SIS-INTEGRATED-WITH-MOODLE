import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPublicationDemoTarget } from "./timetable-publication-demo.mjs";

test("publication sample refuses shared/provider targets and missing explicit gates before connecting", () => {
  const safe = {
    DEMO_MODE: "true",
    SIS_ENABLE_TIMETABLE_DEMO_DRAFTS: "true",
    DATABASE_URL:
      "postgresql://fictional:fixture@127.0.0.1:55437/sis_time003_review_20261004",
    TIMETABLE_DEMO_API_URL: "http://127.0.0.1:3155",
  };
  assert.equal(assertPublicationDemoTarget(safe).api.hostname, "127.0.0.1");
  for (const patch of [
    { DEMO_MODE: "false" },
    { SIS_ENABLE_TIMETABLE_DEMO_DRAFTS: "false" },
    { DATABASE_URL: "postgresql://fictional:fixture@127.0.0.1/production" },
    { DATABASE_URL: "postgresql://fictional:fixture@db.example/review" },
    { TIMETABLE_DEMO_API_URL: "https://sis-moodle.moodlecloud.com" },
    { TIMETABLE_DEMO_API_URL: "http://user:password@localhost" },
    { TIMETABLE_DEMO_API_URL: "http://localhost?token=placeholder" },
    { TIMETABLE_DEMO_API_URL: "http://localhost/not-an-api-root" },
  ])
    assert.throws(
      () => assertPublicationDemoTarget({ ...safe, ...patch }),
      /explicit fictional/,
    );
});

test("cloud publication bootstrap requires exact database, HTTPS API and independent opt-ins", () => {
  const env = {
    DEMO_MODE: "true",
    SIS_ENABLE_TIMETABLE_DEMO_DRAFTS: "true",
    SIS_ENABLE_CLOUD_DEMONSTRATION: "true",
    SIS_DEMO_DATABASE_HOST: "pool.db.example",
    SIS_DEMO_DATABASE_NAME: "sis_demonstration",
    DATABASE_URL:
      "postgresql://demo:private@pool.db.example/sis_demonstration?sslmode=require",
    SIS_DEMO_API_ORIGIN: "https://sis-api.example",
    TIMETABLE_DEMO_API_URL: "https://sis-api.example",
  };
  assert.equal(
    assertPublicationDemoTarget(env).api.origin,
    "https://sis-api.example",
  );
  for (const patch of [
    { SIS_ENABLE_CLOUD_DEMONSTRATION: "false" },
    { SIS_ENABLE_TIMETABLE_DEMO_DRAFTS: "false" },
    { TIMETABLE_DEMO_API_URL: "https://other.example" },
    { TIMETABLE_DEMO_API_URL: "http://sis-api.example" },
    { SIS_DEMO_DATABASE_NAME: "other" },
  ])
    assert.throws(() => assertPublicationDemoTarget({ ...env, ...patch }));
});
