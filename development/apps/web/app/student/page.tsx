import type { ReadinessView, RegistrationStatusView, StudentHomeView } from "@sis/contracts";
import Link from "next/link";
import { cookies } from "next/headers";
import { loadStudent } from "./server";
import { StudentUnavailable } from "./chrome";
import { Notice, PageHeader, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import styles from "./student.module.css";
import { academicHref } from "../../lib/academic-context";
import { loadMine } from "../notifications/inbox";

async function loadRegistrationStatus(): Promise<RegistrationStatusView | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/status`,
      { headers: { cookie: `sid=${encodeURIComponent(sid)}` }, cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    return response.ok ? (await response.json()) as RegistrationStatusView : null;
  } catch {
    return null;
  }
}

async function loadReadiness(): Promise<ReadinessView | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/readiness`,
      { headers: { cookie: `sid=${encodeURIComponent(sid)}` }, cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    return response.ok ? (await response.json()) as ReadinessView : null;
  } catch {
    return null;
  }
}

type MoodleAccessItem = {
  courseRegistrationId: string;
  courseCode: string;
  courseTitle: string;
  periodCode: string | null;
  entitled: boolean;
  reason: string;
  validityPolicy: string | null;
  validUntil: string | null;
};

/** Reasons stay user-facing and never expose internal identifiers. */
const MOODLE_REASON: Record<string, string> = {
  NO_ITEM: "Access has not been assigned for this course yet.",
  NOT_DELIVERED: "Access is being prepared. Try again shortly.",
  REVOKED: "Access to this course was withdrawn.",
  EXPIRED: "Access for this period has ended.",
  WITHDRAWN: "Your student record is not active.",
  PERIOD_CLOSED: "The registration period for this course is closed.",
  COURSE_DROPPED: "You are no longer enrolled in this course.",
};

function moodleReason(value: string | undefined): string | null {
  if (!value) return null;
  if (value === "unavailable")
    return "We could not reach Moodle just now. Try again shortly.";
  if (value === "no-destination")
    return "Moodle access is not configured for this course yet.";
  return MOODLE_REASON[value] ?? "Moodle access is not available for this course.";
}

async function loadMoodleAccess(): Promise<MoodleAccessItem[] | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/moodle/my-access`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { items?: MoodleAccessItem[] };
    return body.items ?? [];
  } catch {
    return null;
  }
}

export default async function StudentPage({
  searchParams,
}: {
  searchParams: Promise<{ moodleError?: string | string[] }>;
}) {
  const home = await loadStudent<StudentHomeView>("/me/home", "/student");
  if (!home.data) return <StudentUnavailable message={home.message} />;
  const board = home.data;
  const params = await searchParams;
  const launchError = moodleReason(
    Array.isArray(params.moodleError) ? params.moodleError[0] : params.moodleError,
  );
  const [registration, readiness, notices, moodle] = await Promise.all([
    loadRegistrationStatus(), loadReadiness(), loadMine("/student"), loadMoodleAccess(),
  ]);
  const registered = Boolean(registration?.registration && registration.registration.period === board.period);
  const actionNeeded = Boolean(registration && !registered && readiness?.period === board.period &&
    ["READY", "AWAITING_STUDENT_INPUT"].includes(readiness.overall));
  const unread = notices.data?.items.filter(item => item.state !== "READ").length;

  return (
    <>
      <PageHeader eyebrow={`Student dashboard · ${board.period}`} title={`Welcome, ${board.displayName}`} lede={`${board.programmeName} · ${board.period}`} />
      <section className={styles.recordPanel} aria-label="General information">
        <h2>General information</h2>
        <div className={styles.facts}>
          <p><span>Student number</span><strong>{board.studentNumber}</strong></p>
          <p><span>Programme</span><strong>{board.programmeName}</strong></p>
          <p><span>Campus</span><strong>{board.campus}</strong></p>
          <p><span>Study mode</span><strong>{board.studyMode}</strong></p>
        </div>
      </section>
      <section className={`${styles.statusPanel} ${!registration ? styles.statusUnknown : ""}`} aria-labelledby="period-status-title">
        <div className={styles.statusHeading}>
          <div>
            <p className={styles.kicker}>Registration</p>
            <h2 id="period-status-title">{!registration ? "Registration status unavailable" : registered ? "Registration completed" : actionNeeded ? "Registration is open" : "Registration is not complete"}</h2>
          </div>
          {registration ? <StatusChip tone={registered ? "success" : "attention"}>{registered ? "Complete" : "Check status"}</StatusChip> : null}
        </div>
        <p className={styles.statusDetail}>
          {!registration
            ? "We could not confirm registration. Open registration to check the current record."
            : registered
              ? `${registration.registration!.courses.length} courses registered for ${board.period}. ${registration.moodle.detail}`
              : actionNeeded
                ? "Choose your courses, check what is ready, then review and submit registration."
                : readiness?.period === board.period
                  ? `Current status: ${readiness.overall.replaceAll("_", " ").toLowerCase()}. Open registration for the next step.`
                  : board.registrationOpensAt
                    ? `The published opening date is ${formatLusaka(board.registrationOpensAt)}. Open registration to check the current status.`
                    : "The registration window has not been confirmed. Open registration to check the current status."}
        </p>
        <Link className={styles.primaryAction} href={registered ? "/student/register" : actionNeeded ? "/student/readiness" : "/student/register"}>
          {registered ? "View registration receipt" : actionNeeded ? "Start registration" : "Check registration"} <span aria-hidden="true">→</span>
        </Link>
      </section>
      {board.onboardingRequiredTotal > board.onboardingRequiredComplete ? (
        <Notice severity="info" title="Onboarding needs attention" message={`${board.onboardingRequiredComplete} of ${board.onboardingRequiredTotal} required tasks are complete. Check your account and registration readiness for details.`} />
      ) : null}
      <section className={styles.taskSection} aria-labelledby="dashboard-links-title">
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>Open a workspace</p><h2 id="dashboard-links-title">Your studies at a glance</h2></div></div>
        <div className={styles.grid}>
          <article className={styles.taskCard}><h3>My studies</h3><p>{registered ? `${registration!.registration!.courses.length} registered courses` : "Course selection and study record"}</p><Link href="/student/courses">Open my studies →</Link></article>
          <article className={styles.taskCard}><h3>Moodle</h3><p>{registration?.moodle.access ? `${registration.moodle.access.confirmedCount} of ${registration.moodle.access.totalCourses} courses ready` : 'Learning materials, assignments and course access'}</p><Link href={registration?.registration ? `${academicHref("/student/courses", registration.registration)}#moodle-learning` : "/student/courses"}>Open Moodle access →</Link></article>
          <article className={styles.taskCard}><h3>Timetable</h3><p>See published sessions for your registered courses.</p><Link href="/student/timetable">Open timetable →</Link></article>
          <article className={styles.taskCard}><h3>Official results</h3><p>Browse released results by period and course.</p><Link href="/student/results">Open results →</Link></article>
          <article className={styles.taskCard}><h3>Notifications</h3><p>{unread == null ? "Updates are unavailable right now." : unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "No unread updates"}</p><Link href="/student/notifications">Open notifications →</Link></article>
        </div>
      </section>
      <section className={styles.taskSection} aria-labelledby="moodle-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Moodle</p>
            <h2 id="moodle-title">Course access</h2>
          </div>
        </div>
        {launchError ? (
          <Notice severity="warning" title="Moodle access" message={launchError} />
        ) : null}
        {moodle && moodle.length > 0 ? (
          <div className={styles.grid}>
            {moodle.map((course) => (
              <article className={styles.taskCard} key={course.courseRegistrationId}>
                <h3>{course.courseCode}</h3>
                <p>{course.courseTitle}</p>
                {course.entitled ? (
                  <>
                    <p>
                      Open the Moodle course without signing in again.
                      {course.validityPolicy === "THIS_PERIOD"
                        ? " Access lasts until the end of this period."
                        : course.validityPolicy === "ACADEMIC_YEAR"
                          ? " Access lasts until the end of this academic year."
                          : " Access lasts while you remain enrolled."}
                    </p>
                    <form action="/api/moodle/launch" method="post">
                      <input
                        type="hidden"
                        name="courseRegistrationId"
                        value={course.courseRegistrationId}
                      />
                      <button className={styles.launchButton} type="submit">
                        Open course <span aria-hidden="true">↗</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <p>
                    {MOODLE_REASON[course.reason] ??
                      "Access is not available for this course."}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.meta}>
            Moodle course access appears here once your registration is complete.
          </p>
        )}
      </section>
      {board.pendingCorrections > 0 ? (
        <p className={styles.meta}><Link href="/student/account">{board.pendingCorrections} profile correction request{board.pendingCorrections === 1 ? "" : "s"} awaiting review. View my account →</Link></p>
      ) : null}
    </>
  );
}
