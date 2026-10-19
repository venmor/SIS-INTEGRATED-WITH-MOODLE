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

export default async function StudentPage() {
  const home = await loadStudent<StudentHomeView>("/me/home", "/student");
  if (!home.data) return <StudentUnavailable message={home.message} />;
  const board = home.data;
  const [registration, readiness, notices] = await Promise.all([
    loadRegistrationStatus(), loadReadiness(), loadMine("/student"),
  ]);
  const registered = Boolean(registration?.registration && registration.registration.period === board.period);
  const actionNeeded = Boolean(registration && !registered && readiness?.period === board.period &&
    ["READY", "AWAITING_STUDENT_INPUT"].includes(readiness.overall));
  const unread = notices.data?.items.filter(item => item.state !== "READ").length;

  return (
    <>
      <PageHeader eyebrow={`Student dashboard · ${board.period}`} title={`Welcome, ${board.displayName}`} lede={`${board.programmeName} · ${board.period}`} />
      <section className={`${styles.statusPanel} ${!registration ? styles.statusUnknown : ""}`} aria-labelledby="period-status-title">
        <div className={styles.statusHeading}>
          <div>
            <p className={styles.kicker}>Registration</p>
            <h2 id="period-status-title">{!registration ? "Status unavailable" : registered ? "Registration completed" : actionNeeded ? "Registration is open" : "Registration is not complete"}</h2>
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
      {board.pendingCorrections > 0 ? (
        <p className={styles.meta}><Link href="/student/account">{board.pendingCorrections} profile correction request{board.pendingCorrections === 1 ? "" : "s"} awaiting review. View my account →</Link></p>
      ) : null}
    </>
  );
}
