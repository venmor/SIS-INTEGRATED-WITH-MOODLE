import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actors,
  catalogue,
  blocks,
  stableId,
  assertTarget,
  validateInputs,
  assertSame,
  foundationPeriod,
  prepare,
} from "./prepare-moodle-demo-sis.mjs";

const local = {
  DEMO_MODE: "true",
  SIS_ENABLE_MOODLE_DEMO_BOOTSTRAP: "true",
  DATABASE_URL: "postgresql://demo:fixture@127.0.0.1/sis_demo_review",
};
test("generated bootstrap refuses unpinned or non-demo database before connection", () => {
  assert.doesNotThrow(() => assertTarget(local));
  for (const patch of [
    { DEMO_MODE: "false" },
    { SIS_ENABLE_MOODLE_DEMO_BOOTSTRAP: undefined },
    { DATABASE_URL: "postgresql://demo:fixture@127.0.0.1/production" },
    { DATABASE_URL: "postgresql://demo:fixture@db.example/sis_review" },
  ])
    assert.throws(() => assertTarget({ ...local, ...patch }));
  const cloud = {
    ...local,
    SIS_ENABLE_CLOUD_DEMONSTRATION: "true",
    SIS_DEMO_DATABASE_HOST: "pool.db.example",
    SIS_DEMO_DATABASE_NAME: "demo",
    DATABASE_URL:
      "postgresql://demo:fixture@pool.db.example/demo?sslmode=require",
  };
  assert.doesNotThrow(() => assertTarget(cloud));
  for (const patch of [
    { SIS_ENABLE_CLOUD_DEMONSTRATION: undefined },
    { SIS_DEMO_DATABASE_HOST: "other.example" },
    { SIS_DEMO_DATABASE_NAME: "other" },
    { DATABASE_URL: "postgresql://demo:fixture@pool.db.example/demo" },
  ])
    assert.throws(() => assertTarget({ ...cloud, ...patch }));
});
function inputs() {
  return {
    manifest: {
      namespace: "sis-demo-2026",
      peopleProvenance: "GENERATED",
      catalogueVersion: "1.0.0",
      users: actors.map((name) => ({
        username: `sis.demo.${name}`,
        idnumber: `sis-demo-2026:person:${name}`,
        firstname: name.split(".")[0],
        lastname: name.split(".")[1],
        email: `${name}@example.invalid`,
      })),
      courses: catalogue.map(([slug, , fullname]) => ({
        idnumber: `sis-demo-2026:course:${slug}:2026`,
        shortname: `SIS-${slug.toUpperCase()}-2026`,
        fullname,
      })),
      enrolments: actors.flatMap((name) =>
        catalogue.map(([slug]) => ({
          user: `sis-demo-2026:person:${name}`,
          course: `sis-demo-2026:course:${slug}:2026`,
          role: name === "nasilele.tembo" ? "teacher" : "student",
        })),
      ),
    },
    credentials: Object.fromEntries(
      actors.map((name) => [
        `sis.demo.${name}`,
        "Generated-test-only-password",
      ]),
    ),
  };
}
test("accepts exactly the four identities and twelve public titles, rejects foreign and duplicate inventory", () => {
  const good = inputs();
  assert.equal(validateInputs(good.manifest, good.credentials).length, 4);
  for (const alter of [
    (v) => {
      v.manifest.namespace = "foreign";
    },
    (v) => {
      v.manifest.users[0].username = "foreign";
    },
    (v) => {
      v.manifest.users[0].idnumber = "foreign:person:chanda.mulenga";
    },
    (v) => {
      v.manifest.users[0].idnumber = v.manifest.users[1].idnumber;
    },
    (v) => {
      delete v.credentials["sis.demo.chanda.mulenga"];
    },
    (v) => {
      v.credentials = {
        users: Object.entries(v.credentials).map(([username, password]) => ({
          username,
          password,
        })),
      };
    },
    (v) => {
      v.manifest.courses[0].fullname = "Invented title";
    },
    (v) => {
      v.manifest.enrolments[0].role = "teacher";
    },
    (v) => {
      v.manifest.enrolments[0] = v.manifest.enrolments[1];
    },
    (v) => {
      v.credentials.foreign = "Generated-test-only-password";
    },
    (v) => {
      v.credentials["sis.demo.chanda.mulenga"] = "";
    },
  ]) {
    const v = inputs();
    alter(v);
    assert.throws(() => validateInputs(v.manifest, v.credentials));
  }
});
test("stable namespaced UUIDs and block selections respect current API contracts", () => {
  assert.equal(
    stableId("student:chanda.mulenga"),
    stableId("student:chanda.mulenga"),
  );
  assert.notEqual(
    stableId("student:chanda.mulenga"),
    stableId("student:bwalya.mwansa"),
  );
  assert.match(
    stableId("programme"),
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  assert.deepEqual(
    blocks.map((b) => b.codes.length),
    [3, 5, 4],
  );
  assert.equal(new Set(blocks.flatMap((b) => b.codes)).size, 12);
  assert.ok(catalogue.every((c) => c[1].length <= 16));
});
test("existing mismatched IDs, credentials, scope and values are never accepted as bootstrap-owned", () => {
  assert.doesNotThrow(() =>
    assertSame(
      {
        id: "same",
        startsAt: new Date("2026-01-01Z"),
        capabilities: ["study"],
      },
      {
        id: "same",
        startsAt: new Date("2026-01-01Z"),
        capabilities: ["study"],
      },
    ),
  );
  for (const [old, wanted] of [
    [{ id: "foreign" }, { id: "ours" }],
    [{ scopeRef: "foreign" }, { scopeRef: "self" }],
    [{ capabilities: ["study", "approve"] }, { capabilities: ["study"] }],
    [{ status: "REVOKED" }, { status: "ACTIVE" }],
  ])
    assert.throws(() => assertSame(old, wanted), /no overwrite/);
});

test("foundation block reuses only a currently usable shared period and otherwise chooses its own context", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  const open = {
    code: "2026S1",
    status: "OPEN",
    registrationOpen: new Date("2026-01-05Z"),
    registrationClose: new Date("2027-12-31Z"),
  };
  assert.equal(foundationPeriod(open, now), "2026S1");
  for (const existing of [
    null,
    { ...open, status: "CLOSED" },
    { ...open, registrationClose: new Date("2026-06-30Z") },
    { ...open, registrationOpen: new Date("2026-11-01Z") },
    { ...open, registrationClose: now },
    { ...open, registrationOpen: null },
    { ...open, code: "OTHER" },
  ])
    assert.equal(foundationPeriod(existing, now), "DEMO-EE-FOUNDATION");
  assert.equal(open.registrationOpen.toISOString(), "2026-01-05T00:00:00.000Z");
});

test("cloud bootstrap allows bounded connection acquisition before its atomic transaction", async () => {
  const {manifest, credentials} = inputs();
  let options;
  const sentinel = new Error('stop before database work');
  const db = {$transaction: async (_body, config) => {options = config; throw sentinel;}};
  await assert.rejects(prepare(db, manifest, credentials, {}), error => error === sentinel);
  assert.equal(options.maxWait, 30000);
  assert.equal(options.timeout, 120000);
});
