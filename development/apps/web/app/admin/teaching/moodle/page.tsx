import { cookies } from "next/headers";
import Link from "next/link";
import styles from "../../staff-workspace.module.css";
import { Notice, StatusChip } from "@sis/ui";

export const dynamic = "force-dynamic";

type TeachingCourse = {
  assignmentId: string;
  teachingRole: string;
  programmeCode: string | null;
  programmeTitle: string | null;
  intake: string | null;
  periodCode: string;
  shellRef: string | null;
  moodleCourseRef: string | null;
  moodleCourseUrl: string | null;
  state: "CONFIRMED" | "WAITING";
};

type TeachingAccess = {
  items: TeachingCourse[];
  moodleUsername: string;
  moodleLoginUrl: string | null;
  confirmedCount: number;
  totalCourses: number;
  state: "READY" | "PARTIAL" | "PENDING" | "NONE";
};

async function load<Teaching>(path: string): Promise<Teaching | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as Teaching) : null;
  } catch {
    return null;
  }
}

// SCR-STAFF-MOODLE-001 Lecturers and coordinators teach into the same Moodle
// courses SIS provisions for students, but the only Moodle entry points were
// the student dashboard and the administrator workspaces. This is the staff
// view of that same delivery: read-only, scoped by the API to the signed-in
// account's own approved teaching assignments, and it issues no credential.
export default async function MoodleTeachingPage() {
  const access = await load<TeachingAccess>("/moodle/my-teaching-access");

  if (!access) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Moodle teaching access</h1>
          <Notice
            severity="warning"
            title="Teaching access unavailable"
            message="Your Moodle teaching access could not be loaded. Sign in again, and if it persists ask an administrator to confirm your teaching assignments are approved."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Moodle teaching access</h1>
        <p className={styles.supporting}>
          <Link href="/">Workspace home</Link>
        </p>

        <Notice
          severity={
            access.state === "READY"
              ? "success"
              : access.state === "NONE"
                ? "info"
                : "warning"
          }
          title={
            access.state === "NONE"
              ? "No approved teaching assignments"
              : access.state === "READY"
                ? "Every course you teach is live in Moodle"
                : "Some Moodle courses are still being prepared"
          }
          message={
            access.state === "NONE"
              ? "Moodle enrolment follows an approved teaching assignment. Nothing is enrolled for you until one exists."
              : `${access.confirmedCount} of ${access.totalCourses} taught courses exist on the Moodle site. You are enrolled as teaching staff by the same provisioning run that prepares student access.`
          }
        />

        {access.moodleLoginUrl ? (
          <section className={styles.section} aria-labelledby="moodle-staff-signin">
            <h2 className={styles.sectionHeading} id="moodle-staff-signin">
              Your Moodle sign-in
            </h2>
            <p className={styles.lede}>
              Moodle user name <code className={styles.code}>{access.moodleUsername}</code> — the account SIS creates
              for you when it enrols you as teaching staff.{" "}
              <a
                href={access.moodleLoginUrl}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                Open Moodle sign-in ↗
              </a>
            </p>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="moodle-taught-courses">
          <h2 className={styles.sectionHeading} id="moodle-taught-courses">
            Courses you teach
          </h2>
          {access.items.length === 0 ? (
            <p className={styles.supporting}>
              No Moodle course shells are linked to your teaching assignments yet.
            </p>
          ) : (
            <ul className={styles.recordList}>
              {access.items.map((course) => (
                <li key={`${course.assignmentId}:${course.periodCode}`}>
                  <strong className={styles.code}>{course.programmeCode ?? course.teachingRole}</strong>{" "}
                  {course.programmeTitle ?? "Programme"} — {course.teachingRole}
                  {course.intake ? `, intake ${course.intake}` : ""}, {course.periodCode}
                  <StatusChip tone={course.state === "CONFIRMED" ? "success" : "info"}>
                    {course.state === "CONFIRMED" ? "Live in Moodle" : "Preparing"}
                  </StatusChip>
                  {course.moodleCourseUrl ? (
                    <a
                      href={course.moodleCourseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      Open course ↗
                    </a>
                  ) : (
                    <p className={styles.supporting}>
                      Shell <code className={styles.code}>{course.shellRef}</code> is registered in SIS. The Moodle
                      course appears here once provisioning creates it on the site.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className={styles.supporting}>
          Teaching enrolment is prepared by the same governed run that gives students their access, so a course that
          is not live here is not yet live for your students either.
        </p>
      </main>
    </div>
  );
}
