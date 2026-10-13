// Add a repeatable fictional master preview through the real API; no enrolments
// or policy approvals are created. Requires the isolated timetable demo seed.
import { createHash } from "node:crypto";

const loopback = (url) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
const database = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
const api = new URL(process.env.TIMETABLE_DEMO_API_URL ?? "http://127.0.0.1:3155");
if (process.env.DEMO_MODE !== "true" || process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS !== "true" ||
    !loopback(database) || !/(test|review|ci)/i.test(database.pathname) || !loopback(api) || api.protocol !== "http:") {
  throw new Error("Use the explicit timetable demo switches, a loopback review/test database and a loopback API.");
}

function stableUuid(value) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const login = await fetch(new URL("/auth/sign-in", api), {
  method: "POST", headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
  body: JSON.stringify({ username: "nasilele.master", password: "Seed-2026-Master" }),
});
if (!login.ok) throw new Error(`Fictional coordinator sign-in failed (${login.status}).`);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Coordinator session was not issued.");
async function call(path, body) {
  const response = await fetch(new URL(path, api), { method: body ? "POST" : "GET",
    headers: { cookie, "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Timetable API ${path} returned ${response.status}.`);
  return response.json();
}
const catalogue = await call("/timetabling/demo-master/catalogue");
const period = catalogue.periods.find((row) => row.code === "DEMO-2026-TEACHING");
if (!period) throw new Error("Run the isolated timetable demo seed first.");
const rule = catalogue.rules.find((row) => row.periodId === period.id && row.campusCode === "DEMO-MAIN");
if (!rule) throw new Error("Save a complete fictional teaching-window rule before creating the sample.");
const codes = ["SWE111", "MTH111", ...Array.from({ length: 10 }, (_, index) => `DEM${101 + index}`)];
const rooms = ["DEMO-R1", "DEMO-R2", "DEMO-R3", "DEMO-R4"].map((code) =>
  catalogue.venues.find((row) => row.campusCode === "DEMO-MAIN" && row.code.endsWith(`· ${code}`)));
if (rooms.some((room) => !room)) throw new Error("The four fictional rooms are missing; run the demo seed.");
const sections = codes.map((code) => catalogue.sections.find((row) =>
  row.courseCode === code && row.periodId === period.id && row.campusCode === "DEMO-MAIN"));
if (sections.some((section) => !section)) throw new Error("The 12 fictional course sections are missing; run the demo seed.");
const slots = ["08:00", "09:15", "10:30", "13:00", "14:15"];
const sessions = [];
for (let meeting = 0; meeting < 2; meeting += 1) {
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const teacher = catalogue.teachers.find((row) => row.sectionId === section.id);
    if (!teacher) throw new Error(`An active lecturer appointment is needed for ${section.courseCode}.`);
    const ordinal = meeting * sections.length + index;
    const date = `2026-10-${String(5 + Math.floor(ordinal / slots.length)).padStart(2, "0")}`;
    const time = slots[ordinal % slots.length];
    const end = `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}${time.slice(2)}`;
    sessions.push({ id: stableUuid(`sample-v1:${period.id}:${section.id}:${meeting}`),
      sectionId: section.id, venueId: rooms[ordinal % rooms.length].id, teacherAssignmentId: teacher.id,
      registrationIds: [], startAt: `${date}T${time}:00+02:00`, endAt: `${date}T${end}:00+02:00`,
      plannedSeats: Math.min(section.capacity, 18 + (index % 5) * 4), requiresStepFreeAccess: false });
  }
}
sessions.sort((a, b) => a.id.localeCompare(b.id));
const content = { periodId: period.id, ruleDraftId: rule.id, sessions };
const history = await call("/timetabling/demo-master");
const saved = await call("/timetabling/demo-master", { ...content,
  expectedVersion: Math.max(0, ...history.filter((row) => row.periodId === period.id).map((row) => row.version)),
  clientRequestId: stableUuid(JSON.stringify(content)) });
console.log(`Fictional master version ${saved.version}: ${codes.length} courses, ${sessions.length} sessions, 4 rooms, 5 days; ${saved.status}.`);
console.log("No official student enrolments were created. Missing roster links remain blocking findings.");
