import { parseAcademicContext } from "../../../lib/academic-context";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Notice, PageHeader } from "@sis/ui";
import type { TimetablePublishedSession } from "@sis/contracts";
import { createHash } from "node:crypto";
import {
  LastConfirmedDate,
  RegisteredCourseView,
  RefreshTimetable,
  type TimetableAvailability,
} from "./timetable-view";
import styles from "./timetable.module.css";
import {
  PublishedTimetableView,
  type PublishedTimetableData,
} from "./published-timetable-view";

export const dynamic = "force-dynamic";

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function hasCourseSource(
  value: unknown,
): value is Omit<TimetableAvailability, "publicationStatus"> {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<TimetableAvailability>;
  return (
    isText(data.attemptId) &&
    isText(data.period) &&
    isTimestamp(data.checkedAt) &&
    typeof data.note === "string" &&
    Array.isArray(data.groups) &&
    data.groups.every(
      (group) =>
        group &&
        isText(group.semester) &&
        Array.isArray(group.courses) &&
        group.courses.every(
          (course) => course && isText(course.code) && isText(course.title),
        ),
    )
  );
}

function isAvailability(value: unknown): value is TimetableAvailability {
  return (
    hasCourseSource(value) &&
    "publicationStatus" in value &&
    value.publicationStatus === "AWAITING_PUBLICATION"
  );
}

function isSession(
  value: unknown,
  courses: Set<string>,
): value is TimetablePublishedSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<TimetablePublishedSession>;
  return (
    isText(session.id) &&
    isText(session.courseCode) &&
    courses.has(session.courseCode) &&
    isText(session.courseTitle) &&
    isText(session.sectionCode) &&
    isText(session.campusCode) &&
    isText(session.venueCode) &&
    typeof session.teacherName === "string" &&
    isText(session.deliveryMode) &&
    session.activityType === "Teaching session" &&
    isTimestamp(session.startAt) &&
    isTimestamp(session.endAt) &&
    Date.parse(session.endAt) > Date.parse(session.startAt)
  );
}

function sameSession(
  first: TimetablePublishedSession,
  second: TimetablePublishedSession,
) {
  return (Object.keys(first) as Array<keyof TimetablePublishedSession>).every(
    (key) => first[key] === second[key],
  );
}

function isPublished(value: unknown): value is PublishedTimetableData {
  if (!hasCourseSource(value)) return false;
  const data = value as Partial<PublishedTimetableData>;
  const publication = data.publication;
  const courses = new Set(
    data.groups!.flatMap((group) => group.courses.map((course) => course.code)),
  );
  if (!(
    data.publicationStatus === "FICTIONAL_PUBLISHED" &&
    !!publication &&
    isText(publication.id) &&
    Number.isInteger(publication.version) &&
    publication.version > 0 &&
    Number.isInteger(publication.masterVersion) &&
    publication.masterVersion > 0 &&
    typeof publication.contentDigest === "string" &&
    /^[a-f0-9]{64}$/i.test(publication.contentDigest) &&
    isTimestamp(publication.publishedAt) &&
    (publication.previousVersion === null ||
      (Number.isInteger(publication.previousVersion) &&
        publication.previousVersion > 0 &&
        publication.previousVersion < publication.version)) &&
    Array.isArray(data.sessions) &&
    data.sessions.length > 0 &&
    data.sessions.every((session) => isSession(session, courses)) &&
    Array.isArray(data.changes)
  ))
    return false;
  const current = new Map(
    data.sessions.map((session) => [session.id, session]),
  );
  if (current.size !== data.sessions.length) return false;
  if (publication.previousVersion === null && data.changes.length) return false;
  const changedIds = new Set<string>();
  return data.changes.every((change) => {
    if (
      !change ||
      !isText(change.sessionId) ||
      changedIds.has(change.sessionId)
    )
      return false;
    changedIds.add(change.sessionId);
    const before = change.before;
    const after = change.after;
    if (
      before !== null &&
      (!isSession(before, courses) || before.id !== change.sessionId)
    )
      return false;
    if (
      after !== null &&
      (!isSession(after, courses) || after.id !== change.sessionId)
    )
      return false;
    const session = current.get(change.sessionId);
    if (change.kind === "REMOVED")
      return !!before && after === null && !session;
    if (!after || !session || !sameSession(after, session)) return false;
    if (change.kind === "ADDED") return before === null;
    return change.kind === "CHANGED" && !!before && !sameSession(before, after);
  });
}

async function loadActor(): Promise<string | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/auth/me`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return null;
    const me = body as {
      account?: { accountId?: unknown };
      activeWorkspace?: { role?: unknown };
    };
    return me.activeWorkspace?.role === "STUDENT" &&
      isText(me.account?.accountId)
      ? me.account.accountId
      : null;
  } catch {
    return null;
  }
}

async function loadAvailability(
  query: URLSearchParams,
  invalidContext: boolean,
): Promise<
  | { kind: "registered"; data: TimetableAvailability }
  | { kind: "published"; data: PublishedTimetableData }
  | { kind: "registration-required" }
  | { kind: "unavailable"; message: string; recoverable?: boolean }
> {
  const sid = (await cookies()).get("sid")?.value;
  const context = query.size ? `?${query}` : "";
  const returnTo = `/student/timetable${context}`;
  if (!sid) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  if (invalidContext)
    return {
      kind: "unavailable",
      message:
        "Choose one programme attempt and academic period. Your registration is unchanged.",
    };
  let response: Response;
  try {
    response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/timetable${context}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    return {
      kind: "unavailable",
      recoverable: true,
      message:
        "We cannot reach the timetable service. Your registration is unchanged. Try again shortly.",
    };
  }
  if (response.status === 401)
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      body && typeof body === "object"
        ? (body as { code?: unknown; message?: unknown })
        : {};
    if (response.status === 404 && error.code === "TIMETABLE_NOT_AVAILABLE")
      return { kind: "registration-required" };
    return {
      kind: "unavailable",
      recoverable: response.status >= 500,
      message:
        typeof error.message === "string" && error.message
          ? error.message
          : "Timetable status is unavailable. Try again shortly.",
    };
  }
  if (
    hasCourseSource(body) &&
    ((query.has("attemptId") && query.get("attemptId") !== body.attemptId) ||
      (query.has("period") && query.get("period") !== body.period))
  )
    return {
      kind: "unavailable",
      message:
        "The requested programme attempt and academic period could not be confirmed. Your registration is unchanged.",
    };
  if (isPublished(body)) return { kind: "published", data: body };
  if (!isAvailability(body))
    return {
      kind: "unavailable",
      message:
        "The timetable status could not be confirmed. Try again shortly.",
    };
  return { kind: "registered", data: body };
}

export default async function StudentTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{
    attemptId?: string | string[];
    period?: string | string[];
  }>;
}) {
  const requested = await searchParams;
  const parsed = parseAcademicContext(requested);
  const query = parsed.query;
  const invalidContext = !parsed.valid;
  const [result, actor] = await Promise.all([
    loadAvailability(query, invalidContext),
    loadActor(),
  ]);
  const confirmed =
    result.kind === "registered" || result.kind === "published"
      ? result.data
      : null;
  if (confirmed && (!query.has("attemptId") || !query.has("period"))) {
    query.set("attemptId", confirmed.attemptId!);
    query.set("period", confirmed.period);
    redirect(`/student/timetable?${query}`);
  }
  const scopeKey =
    actor && !invalidContext && query.get("attemptId") && query.get("period")
      ? createHash("sha256")
          .update(
            JSON.stringify([
              actor,
              query.get("attemptId"),
              query.get("period"),
            ]),
          )
          .digest("hex")
      : null;
  return (
    <>
      <PageHeader
        eyebrow="Student portal"
        title="My timetable"
        lede="Check timetable availability for your registered courses."
      />
      {scopeKey ? (
        <LastConfirmedDate
          scopeKey={scopeKey}
          checkedAt={confirmed?.checkedAt ?? null}
          unavailable={
            result.kind === "unavailable" && result.recoverable === true
          }
        />
      ) : null}
      {result.kind === "registration-required" ? (
        <>
          <Notice
            severity="info"
            title="Complete registration first"
            message="Your timetable becomes available after formal registration and timetable publication."
          />
          <p className={styles.actions}>
            <Link href={`/student/register${query.size ? `?${query}` : ""}`}>
              Review registration
            </Link>
          </p>
        </>
      ) : result.kind === "unavailable" ? (
        <>
          <Notice
            severity="warning"
            title="Timetable status unavailable"
            message={result.message}
          />
          <p className={styles.actions}>
            <RefreshTimetable />
          </p>
        </>
      ) : result.kind === "published" ? (
        <>
          <Notice
            severity="info"
            title="Fictional timetable published"
            message={`Fictional university rehearsal. ${result.data.note}`}
          />
          <PublishedTimetableView data={result.data} />
        </>
      ) : (
        <>
          <Notice
            severity="info"
            title="Timetable being prepared"
            message={result.data.note}
          />
          <RegisteredCourseView data={result.data} />
        </>
      )}
    </>
  );
}
