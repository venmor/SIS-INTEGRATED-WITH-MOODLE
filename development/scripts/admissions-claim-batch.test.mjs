import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createClaimBatch,
  runClaimBatch,
} from "../apps/web/app/admin/admissions/queue/claim-batch.ts";

const selections = [
  {
    applicationId: "11111111-1111-4111-8111-111111111111",
    reference: "APP-BATCH-1",
    version: 3,
  },
  {
    applicationId: "22222222-2222-4222-8222-222222222222",
    reference: "APP-BATCH-2",
    version: 7,
  },
  {
    applicationId: "33333333-3333-4333-8333-333333333333",
    reference: "APP-BATCH-3",
    version: 2,
  },
];
const refused = (status, code) =>
  Object.assign(new Error("Refused"), { status, detail: { code } });
const confirmed = (item) => ({
  applicationId: item.applicationId,
  status: "CLAIMED",
});
test("batch selection validates bounds, versions and duplicates before allocating commands", () => {
  const batch = createClaimBatch(selections);
  assert.equal(batch.length, 3);
  assert.equal(new Set(batch.map((x) => x.idempotencyKey)).size, 3);
  assert.deepEqual(
    batch.map((x) => x.state),
    ["WAITING", "WAITING", "WAITING"],
  );
  for (const items of [
    [],
    [selections[0], selections[0]],
    [{ ...selections[0], version: 0 }],
    Array.from({ length: 51 }, (_, i) => ({
      ...selections[0],
      applicationId: `id-${i}`,
    })),
  ])
    assert.throws(() => createClaimBatch(items));
});
test("mixed claim outcomes are retained per case and never report a whole batch success", async () => {
  const batch = createClaimBatch(selections),
    progress = [];
  const out = await runClaimBatch(
    batch,
    async (item) => {
      if (item.applicationId === selections[1].applicationId)
        throw refused(409, "VERSION_CONFLICT");
      if (item.applicationId === selections[2].applicationId)
        throw refused(404, "NOT_FOUND");
      return confirmed(item);
    },
    (items) => progress.push(items.map((x) => x.state)),
    () => false,
  );
  assert.deepEqual(
    out.map((x) => x.state),
    ["CONFIRMED", "CHANGED", "UNAVAILABLE"],
  );
  assert.deepEqual(
    batch.map((x) => x.state),
    ["WAITING", "WAITING", "WAITING"],
  );
  assert.equal(progress.length, 3);
});
test("lost response stops new commands and resuming uses the same uncertain key", async () => {
  const batch = createClaimBatch(selections),
    calls = [];
  const stopped = await runClaimBatch(
    batch,
    async (item) => {
      calls.push(item.idempotencyKey);
      throw new Error("connection lost");
    },
    () => {},
    () => false,
  );
  assert.deepEqual(
    stopped.map((x) => x.state),
    ["UNCERTAIN", "WAITING", "WAITING"],
  );
  assert.equal(calls.length, 1);
  const resumed = await runClaimBatch(
    stopped,
    async (item) => {
      calls.push(item.idempotencyKey);
      return confirmed(item);
    },
    () => {},
    () => false,
  );
  assert.equal(calls[0], calls[1]);
  assert.deepEqual(
    resumed.map((x) => x.state),
    ["CONFIRMED", "CONFIRMED", "CONFIRMED"],
  );
});
test("resuming skips confirmed and rejected rows rather than reallocating them", async () => {
  const batch = createClaimBatch(selections).map((x, i) => ({
    ...x,
    state: i === 0 ? "CONFIRMED" : i === 1 ? "CHANGED" : "WAITING",
  }));
  const calls = [];
  const out = await runClaimBatch(
    batch,
    async (item) => {
      calls.push(item.applicationId);
      return confirmed(item);
    },
    () => {},
    () => false,
  );
  assert.deepEqual(calls, [selections[2].applicationId]);
  assert.deepEqual(
    out.map((x) => x.state),
    ["CONFIRMED", "CHANGED", "CONFIRMED"],
  );
});
test("revocation and rate limits stop subsequent commands and retain pending work", async () => {
  for (const [status, want] of [
    [403, "ACCESS_CHANGED"],
    [401, "ACCESS_CHANGED"],
    [429, "RATE_LIMITED"],
  ]) {
    let calls = 0;
    const out = await runClaimBatch(
      createClaimBatch(selections),
      async () => {
        calls++;
        throw refused(status);
      },
      () => {},
      () => false,
    );
    assert.equal(calls, 1);
    assert.deepEqual(
      out.map((x) => x.state),
      [want, "WAITING", "WAITING"],
    );
  }
});
test("pause finishes the in-flight claim and does not start another", async () => {
  let pause = false,
    calls = 0;
  const out = await runClaimBatch(
    createClaimBatch(selections),
    async (item) => {
      calls++;
      pause = true;
      return confirmed(item);
    },
    () => {},
    () => pause,
  );
  assert.equal(calls, 1);
  assert.deepEqual(
    out.map((x) => x.state),
    ["CONFIRMED", "WAITING", "WAITING"],
  );
});
test("malformed confirmations and conflicting command references remain uncertain", async () => {
  for (const claim of [
    async () => ({
      applicationId: selections[1].applicationId,
      status: "CLAIMED",
    }),
    async () => {
      throw refused(409, "IDEMPOTENCY_CONFLICT");
    },
    async () => {
      throw refused(500);
    },
  ]) {
    const out = await runClaimBatch(
      createClaimBatch(selections),
      claim,
      () => {},
      () => false,
    );
    assert.deepEqual(
      out.map((x) => x.state),
      ["UNCERTAIN", "WAITING", "WAITING"],
    );
  }
});
