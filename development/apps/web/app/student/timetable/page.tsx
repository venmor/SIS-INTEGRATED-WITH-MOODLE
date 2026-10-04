import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import styles from "../../applicant/applicant.module.css";

export const dynamic = "force-dynamic";

interface TimetableAvailability {
  period: string;
  publicationStatus: "AWAITING_PUBLICATION";
  checkedAt: string;
  note: string;
  groups: Array<{
    semester: string;
    courses: Array<{ code: string; title: string }>;
  }>;
}

async function loadAvailability(): Promise<
  | { kind: "registered"; data: TimetableAvailability }
  | { kind: "registration-required" }
  | { kind: "unavailable"; message: string }
> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Ftimetable");
  let response: Response;
  try {
    response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/timetable`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    return {
      kind: "unavailable",
      message:
        "We cannot reach the timetable service. Your registration is unchanged. Try again shortly.",
    };
  }
  if (response.status === 401)
    redirect("/sign-in?returnTo=%2Fstudent%2Ftimetable");
  const body = (await response.json().catch(() => ({}))) as
    TimetableAvailability | { code?: string; message?: string };
  if (!response.ok) {
    if (
      response.status === 404 &&
      "code" in body &&
      body.code === "TIMETABLE_NOT_AVAILABLE"
    )
      return { kind: "registration-required" };
    return {
      kind: "unavailable",
      message:
        "message" in body && body.message
          ? body.message
          : "Timetable status is unavailable. Try again shortly.",
    };
  }
  const data = body as TimetableAvailability;
  if (data.publicationStatus !== "AWAITING_PUBLICATION")
    return {
      kind: "unavailable",
      message:
        "The timetable status could not be confirmed. Try again shortly.",
    };
  return { kind: "registered", data };
}

export default async function StudentTimetablePage() {
  const result = await loadAvailability();
  return (
    <>
      <p className={styles.eyebrow}>Student portal</p>
      <h1>My timetable</h1>
      {result.kind === "registration-required" ? (
        <>
          <Notice
            severity="info"
            title="Complete registration first"
            message="Your timetable becomes available after formal registration and timetable publication."
          />
          <p>
            <Link href="/student/register">Review registration</Link>
          </p>
        </>
      ) : result.kind === "unavailable" ? (
        <Notice
          severity="warning"
          title="Timetable status unavailable"
          message={result.message}
        />
      ) : (
        <>
          <Notice
            severity="info"
            title="Timetable being prepared"
            message={result.data.note}
          />
          <p className={styles.muted}>
            Registered courses · {result.data.period} · Checked{" "}
            {formatLusaka(result.data.checkedAt)}
          </p>
          {result.data.groups.map((group) => (
            <section
              key={group.semester}
              aria-label={`${group.semester} registered courses`}
            >
              <h2>{group.semester}</h2>
              <ul>
                {group.courses.map((course) => (
                  <li key={course.code}>
                    {course.code} — {course.title}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p>
            <Link href="/student/register">View registration</Link>
          </p>
        </>
      )}
    </>
  );
}
