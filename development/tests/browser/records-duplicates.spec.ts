import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { createRecordsOfficer } from "./fixtures";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function db() {
  const url = process.env.DATABASE_URL;
  if (!url || !/(test|review|ci|browser)/i.test(new URL(url).pathname)) {
    throw new Error("Browser tests require an isolated test/review database.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

async function noOverflow(page: any) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("records duplicates: officer reviews and resolves a match", async ({
  page,
}) => {
  // Seed a possible duplicate directly: two people, one shared email, one
  // queued candidate. People and candidates carry no other relations here.
  const prisma = db();
  const email = `duplicate-${randomUUID()}@demo.invalid`;
  let candidateId: string;
  try {
    const first = await prisma.person.create({
      data: { displayName: "Duplicate One", email },
    });
    const second = await prisma.person.create({
      data: { displayName: "Duplicate Two", email },
    });
    const candidate = await prisma.identityMatchCandidate.create({
      data: {
        applicationId: randomUUID(),
        personId: second.id,
        candidatePersonId: first.id,
        reason: "Same email address as another person record.",
        status: "PENDING",
      },
    });
    candidateId = candidate.id;
  } finally {
    await prisma.$disconnect();
  }

  const officer = await createRecordsOfficer();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.getByLabel("Username", { exact: true }).fill(officer.username);
  await page.getByLabel("Password", { exact: true }).fill(officer.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/", { timeout: 20000 });
  await expect(
    page.getByRole("link", { name: "Identity review", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/records/duplicates");
  await expect(
    page.getByRole("heading", { name: "Identity review queue" }),
  ).toBeVisible();
  await expect(page.getByText("Same email address")).toBeVisible();
  await page
    .getByLabel("Evidence for this decision")
    .fill("Different birth dates on file.");
  await page.getByRole("button", { name: "Keep separate" }).click();
  await expect(page.getByText("Conversion may proceed.")).toBeVisible();
  await expect(page.getByText("No pending matches")).toBeVisible();
  await expect(
    page.getByRole("form", { name: `Resolve identity match ${candidateId}` }),
  ).toHaveCount(0);
  await noOverflow(page);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
