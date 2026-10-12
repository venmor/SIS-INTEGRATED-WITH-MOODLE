import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isDemonstrationDatabaseTarget,
  isDemonstrationApiTarget,
} from "../packages/config/src/demo-environment.ts";
const cloud = {
  DEMO_MODE: "true",
  SIS_ENABLE_CLOUD_DEMONSTRATION: "true",
  SIS_DEMO_DATABASE_HOST: "pool.db.example",
  SIS_DEMO_DATABASE_DIRECT_HOST: "direct.db.example",
  SIS_DEMO_DATABASE_NAME: "sis_demonstration",
  DATABASE_URL:
    "postgresql://demo:private@pool.db.example/sis_demonstration?sslmode=require",
  SIS_DEMO_API_ORIGIN: "https://sis-api.example",
};
test("explicit exact cloud host and database pins permit TLS pool/direct targets", () => {
  assert.equal(isDemonstrationDatabaseTarget(cloud), true);
  assert.equal(
    isDemonstrationDatabaseTarget({
      ...cloud,
      DATABASE_URL:
        "postgres://demo:private@direct.db.example/sis_demonstration?sslmode=verify-full",
    }),
    true,
  );
});
test("cloud opt-in never broadens absent pins, TLS, wrong host/database or production default", () => {
  for (const patch of [
    { DEMO_MODE: "false" },
    { SIS_ENABLE_CLOUD_DEMONSTRATION: undefined },
    { SIS_DEMO_DATABASE_HOST: undefined },
    { SIS_DEMO_DATABASE_NAME: undefined },
    {
      DATABASE_URL:
        "postgresql://demo:private@evil.db.example/sis_demonstration?sslmode=require",
    },
    {
      DATABASE_URL:
        "postgresql://demo:private@pool.db.example/production?sslmode=require",
    },
    {
      DATABASE_URL:
        "postgresql://demo:private@pool.db.example/sis_demonstration",
    },
    {
      DATABASE_URL:
        "postgresql://demo:private@pool.db.example/sis_demonstration?sslmode=disable",
    },
    {
      DATABASE_URL:
        "postgresql://demo:private@pool.db.example/sis_demonstration?sslmode=require&sslmode=disable",
    },
    {
      DATABASE_URL: "https://pool.db.example/sis_demonstration?sslmode=require",
    },
    {
      DATABASE_URL:
        "postgresql://demo:private@pool.db.example:9999/sis_demonstration?sslmode=require",
    },
    {
      DATABASE_URL:
        "postgresql://demo:private@pool.db.example/sis_demonstration?sslmode=require&ssl=false",
    },
  ])
    assert.equal(
      isDemonstrationDatabaseTarget({ ...cloud, ...patch }),
      false,
      JSON.stringify(Object.keys(patch)),
    );
});
test("local isolated review behaviour remains gated by DEMO_MODE", () => {
  const local = {
    DEMO_MODE: "true",
    DATABASE_URL:
      "postgresql://demo:private@127.0.0.1:55437/sis_time003_review_20261004",
  };
  assert.equal(isDemonstrationDatabaseTarget(local), true);
  assert.equal(
    isDemonstrationDatabaseTarget({ ...local, DEMO_MODE: "false" }),
    false,
  );
  assert.equal(
    isDemonstrationDatabaseTarget({
      ...local,
      DATABASE_URL: "postgresql://demo:private@127.0.0.1/production",
    }),
    false,
  );
});
test("cloud bootstrap API requires exact HTTPS origin and exact database target", () => {
  assert.equal(
    isDemonstrationApiTarget(cloud, "https://sis-api.example"),
    true,
  );
  for (const value of [
    "http://sis-api.example",
    "https://other.example",
    "https://user:private@sis-api.example",
    "https://sis-api.example/path",
    "https://sis-api.example?token=x",
    "https://sis-api.example#x",
  ])
    assert.equal(isDemonstrationApiTarget(cloud, value), false);
  assert.equal(
    isDemonstrationApiTarget(
      { ...cloud, SIS_DEMO_API_ORIGIN: undefined },
      "https://sis-api.example",
    ),
    false,
  );
  assert.equal(
    isDemonstrationApiTarget(
      { ...cloud, SIS_DEMO_API_ORIGIN: "https://sis-api.example/path" },
      "https://sis-api.example/path",
    ),
    false,
  );
  assert.equal(
    isDemonstrationApiTarget(
      { ...cloud, SIS_ENABLE_CLOUD_DEMONSTRATION: undefined },
      "https://sis-api.example",
    ),
    false,
  );
  assert.equal(isDemonstrationApiTarget(cloud, "http://127.0.0.1:3155"), false);
});

test("connection query options cannot override pinned target or TLS semantics", () => {
  for (const query of [
    "host=evil.db.example",
    "port=6543",
    "dbname=production",
    "database=production",
    "user=other",
    "password=other",
    "sslrootcert=system",
    "sslmode=require&uselibpqcompat=true",
  ]) {
    assert.equal(
      isDemonstrationDatabaseTarget({
        ...cloud,
        DATABASE_URL: cloud.DATABASE_URL + "&" + query,
      }),
      false,
      query,
    );
  }
  assert.equal(
    isDemonstrationDatabaseTarget({
      ...cloud,
      DATABASE_URL:
        cloud.DATABASE_URL +
        "&channel_binding=require&connect_timeout=15&application_name=sis-demo",
    }),
    true,
  );
});
