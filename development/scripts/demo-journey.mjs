// demo-journey — build UI walkthrough data through the real HTTP API.
// Fictional demo only. Journey A (daka.c) stops at Submitted so the officer
// queue has live work; journey B (phiri.n) runs end to end to a registered
// student. Idempotent: skips any journey whose application already exists.
// Usage: start the API first (DEMO_MODE=true, demo-fixtures scanner), then
//   node scripts/with-env.mjs node scripts/demo-journey.mjs
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.DEMO_JOURNEY_API ?? "http://127.0.0.1:3101";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const key = () => randomUUID();
const CSRF = { "x-requested-with": "XMLHttpRequest" };

function jar() {
  let sid = "";
  return {
    get cookie() {
      return sid;
    },
    useToken(token) {
      sid = `sid=${token}`;
    },
    async req(method, path, body, form = null) {
      const headers = { ...CSRF };
      if (sid) headers.cookie = sid;
      let payload = undefined;
      if (form) {
        payload = form;
      } else if (body !== undefined) {
        headers["content-type"] = "application/json";
        payload = JSON.stringify(body);
      }
      const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: payload,
      });
      const setCookie = res.headers.get("set-cookie") ?? "";
      const match = setCookie.match(/sid=([^;]+)/);
      if (match) sid = `sid=${match[1]}`;
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        throw new Error(
          `${method} ${path} -> ${res.status} ${JSON.stringify(data)?.slice(0, 300)}`,
        );
      }
      return data;
    },
  };
}

async function login(username, password) {
  const c = jar();
  await c.req("POST", "/auth/sign-in", { username, password });
  if (!c.cookie) throw new Error(`no session for ${username}`);
  return c;
}

async function submitApplication(c, offeringId, givenName, familyName) {
  const started = await c.req("POST", "/applications", {
    offeringId,
    confirmed: true,
    idempotencyKey: key(),
  });
  const id = started.id;
  let version = started.version;
  const save = async (section, data) => {
    const r = await c.req("POST", `/applications/${id}/sections/${section}`, {
      version,
      idempotencyKey: key(),
      complete: true,
      data,
    });
    version = r.version;
  };
  await save("personal", {
    givenName,
    familyName,
    dateOfBirth: "2000-01-01",
  });
  await save("contact", { preferredChannel: "PORTAL" });
  await save("qualifications", {
    routeCode: "ECZ",
    institution: "Fictional ECZ",
    awardTitle: "Grade 12",
    completionYear: 2025,
    status: "COMPLETED",
    subjects: [
      { subject: "Mathematics", grade: 4 },
      { subject: "English", grade: 5 },
    ],
  });
  const pdf = await readFile(
    join(root, "packages/test-fixtures/documents/fictional-result.pdf"),
  );
  const form = new FormData();
  form.set("category", "qualification");
  form.set("version", String(version));
  form.set("idempotencyKey", key());
  form.set("file", new File([pdf], "fictional-result.pdf", { type: "application/pdf" }));
  const uploaded = await c.req(
    "POST",
    `/applications/${id}/documents`,
    undefined,
    form,
  );
  const docId = uploaded.documents.at(-1).id;
  version = uploaded.version;
  await c.req("POST", `/applications/${id}/documents/${docId}/scan`, {
    version,
    idempotencyKey: key(),
  });
  const review = await c.req("GET", `/applications/${id}/review`);
  version = review.application.version;
  await c.req("POST", `/applications/${id}/submit`, {
    version,
    confirmed: true,
    idempotencyKey: key(),
    declarations: [
      { id: "accuracy", version: "DEMO-DECLARATION-v1", accepted: true },
      { id: "evidence", version: "DEMO-DECLARATION-v1", accepted: true },
      { id: "processing", version: "DEMO-DECLARATION-v1", accepted: true },
    ],
  });
  return id;
}

async function main() {
  const offering = await prisma.programmeOffering.findFirstOrThrow({
    where: { programme: { code: "SWE" }, availability: "OPEN" },
  });
  const officer = await login("temwani.r", "Seed-2026-Temwani");
  const approver = await login("kasonde.a", "Seed-2026-Kasonde");
  const records = await login("mwansa.k", "Seed-2026-Mwansa");

  // Journey A: submitted application waiting in the officer queue.
  const daka = await prisma.account.findUniqueOrThrow({
    where: { username: "daka.c" },
  });
  const existingA = await prisma.application.findFirst({
    where: { accountId: daka.id },
  });
  if (existingA) {
    console.log(`journey A: already present (${existingA.id})`);
  } else {
    const a = await login("daka.c", "Seed-2026-Daka");
    const id = await submitApplication(a, offering.id, "Daka", "Chanda");
    console.log(`journey A: submitted ${id}`);
  }

  // Journey B: full run to a registered student.
  const phiri = await prisma.account.findUniqueOrThrow({
    where: { username: "phiri.n" },
  });
  const existingB = await prisma.application.findFirst({
    where: { accountId: phiri.id },
  });
  let appId = existingB?.id;
  const b = await login("phiri.n", "Seed-2026-Phiri");
  if (!existingB) {
    appId = await submitApplication(b, offering.id, "Phiri", "Nalungwe");
    console.log(`journey B: submitted ${appId}`);
  }
  const timelineVersion = async () =>
    (await b.req("GET", `/applications/${appId}/timeline`)).version;
  const current = await prisma.application.findUniqueOrThrow({
    where: { id: appId },
    include: { decision: true },
  });
  if (!current.decision && current.state === "Submitted") {
    await officer.req("POST", `/review/${appId}/claim`, {
      version: await timelineVersion(),
      idempotencyKey: key(),
    });
    const queue = await officer.req("GET", `/review/queue/${appId}`);
    await officer.req("POST", `/review/${appId}/recommendations`, {
      version: queue.version,
      idempotencyKey: key(),
      eligibilityOutcome: "ELIGIBLE",
      recommendation: "FAVOURABLE",
      rationale: "Demo journey fixture.",
    });
    const queue2 = await officer.req("GET", `/review/queue/${appId}`);
    await approver.req("POST", `/review/${appId}/decision/release`, {
      version: queue2.version,
      idempotencyKey: key(),
      outcome: "ADMIT_WITH_CONDITIONS",
      message: "Offered a place with conditions.",
      acceptBy: "2027-01-15T17:00:00.000Z",
      conditions: [],
    });
    await b.req("POST", `/applications/${appId}/offer/response`, {
      version: await timelineVersion(),
      idempotencyKey: key(),
      decision: "ACCEPT",
      declarations: [
        "UNDERSTAND_TERMS",
        "ACCEPT_PROGRAMME",
        "INFO_ACCURATE",
        "REGISTRATION_SEPARATE",
      ],
    });
    for (const taskKey of ["CONFIRM_CONTACT", "ACCEPT_DECLARATIONS"]) {
      await b.req("POST", `/applications/${appId}/onboarding/tasks`, {
        version: await timelineVersion(),
        idempotencyKey: key(),
        taskKey,
      });
    }
    await records.req("POST", `/records/applications/${appId}/convert`, {
      idempotencyKey: key(),
    });
    console.log(`journey B: converted ${appId}`);
  } else {
    console.log(`journey B: already decided (${appId})`);
  }

  // Student tail: mint a student session, save plan, submit registration.
  const assignment = await prisma.roleAssignment.findFirst({
    where: { accountId: phiri.id, role: "STUDENT" },
  });
  if (!assignment) throw new Error("journey B: no STUDENT assignment");
  const token = key();
  await prisma.session.create({
    data: {
      accountId: phiri.id,
      activeAssignmentId: assignment.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const student = jar();
  // The account signs in on its APP workspace; use the minted student token.
  student.useToken(token);
  const existing = await student.req("GET", "/registration/status");
  if (!existing.registration) {
    const saved = await student.req("POST", "/registration/plan", {
      version: 1,
      idempotencyKey: key(),
      courseCodes: ["SWE111", "MTH111", "ENG111"],
    });
    const done = await student.req("POST", "/registration/submit", {
      version: saved.version,
      idempotencyKey: key(),
      declarations: ["PLAN_ACCURATE", "RULES_UNDERSTOOD", "FINANCE_UNDERSTOOD"],
    });
    console.log(`journey B: registered ${done.receipt}`);
  } else {
    console.log(`journey B: already registered ${existing.registration.receipt}`);
  }
}

await main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
