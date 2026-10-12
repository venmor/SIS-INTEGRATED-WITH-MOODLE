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
