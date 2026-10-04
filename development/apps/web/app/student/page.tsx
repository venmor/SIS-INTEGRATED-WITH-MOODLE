import type {
  RegistrationStatusView,
  StudentCorrectionView,
  StudentHomeView,
} from "@sis/contracts";
import Link from "next/link";
import { cookies } from "next/headers";
import { loadStudent } from "./server";
import { StudentUnavailable } from "./chrome";
import { Notice, PageHeader, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import { ContactForm, CorrectionForm } from "./forms";
import styles from "./student.module.css";

async function loadRegistrationStatus(): Promise<RegistrationStatusView | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/status`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as RegistrationStatusView;
  } catch {
    return null;
  }
}

function correctionFieldLabel(field: string) {
  if (field === "displayName") return "Official name";
  if (field === "email") return "Email address";
  if (field === "phone") return "Mobile number";
  return "Record detail";
}

function correctionStatusLabel(status: string) {
  if (status === "PENDING") return "Awaiting review";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Not approved";
  return "Status unavailable";
}

// The student record grants access; only registration/status confirms the
// current-period registration. Failed reads remain unknown, not unregistered.
export default async function StudentPage() {
  const home = await loadStudent<StudentHomeView>("/me/home", "/student");
  if (!home.data) return <StudentUnavailable message={home.message} />;
  const board = home.data;
  const [registration, corrections] = await Promise.all([
    loadRegistrationStatus(),
    loadStudent<{ items: StudentCorrectionView[] }>(
      "/me/corrections",
      "/student",
    ),
  ]);
  const registered = Boolean(registration?.registration);
  const tasks = registered
    ? [
        {
          href: "/student/changes",
          title: "Course changes",
          body: "Request an addition or drop, or review an existing request.",
          action: "Manage course changes",
        },
        {
          href: "/student/finance",
          title: "Finance and clearance",
          body: "Check your invoice, payments and clearance status.",
          action: "Open finance",
        },
      ]
    : [
        {
          href: "/student/courses",
          title: "Plan your courses",
          body: "Choose permitted courses for the period. Validation explains every block.",
          action: "Choose courses",
        },
        {
          href: "/student/readiness",
          title: "Registration readiness",
          body: "Every condition with its owner and next step before you submit.",
          action: "Check readiness",
        },
        {
          href: "/student/register",
          title: "Review and submit registration",
          body: "Review the validated plan, accept declarations, submit once.",
          action: "Review registration",
        },
        {
          href: "/student/finance",
          title: "Finance and clearance",
          body: "Invoice, payments, clearance status and what blocks registration.",
          action: "Open finance",
        },
      ];
  return (
    <>
      <PageHeader
        eyebrow={`Student portal · ${board.period} · ${board.studentNumber}`}
        title="Welcome to the student portal"
        lede={`${board.displayName} · ${board.programmeName}`}
      />
      <section
        className={`${styles.statusPanel} ${!registration ? styles.statusUnknown : ""}`}
        aria-labelledby="period-status-title"
      >
        <div className={styles.statusHeading}>
          <div>
            <p className={styles.kicker}>Current period · {board.period}</p>
            <h2 id="period-status-title">
              {registration
                ? registered
                  ? "Registration completed"
                  : "Not registered for this period"
                : "Registration status unavailable"}
            </h2>
          </div>
          {registration ? (
            <StatusChip tone={registered ? "success" : "attention"}>
              {registered ? "Registered" : "Action may be needed"}
            </StatusChip>
          ) : null}
        </div>
        <p className={styles.statusDetail}>
          {registration
            ? registered
              ? `Your registration covers ${registration.registration?.courses.length ?? 0} courses. ${registration.moodle.detail}`
              : "Your student record exists, but registration has not been submitted for this period. Check readiness before continuing."
            : "We could not confirm your current registration. Open registration to check the latest state before taking action."}
        </p>
        <div className={styles.facts}>
          <p>
            <span>Study details</span>
            <strong>
              {[board.intake, board.campus, board.studyMode]
                .filter(Boolean)
                .join(" · ")}
            </strong>
          </p>
          <p>
            <span>Registration period</span>
            <strong>
              {board.registrationOpensAt
                ? `Opens ${formatLusaka(board.registrationOpensAt)}`
                : "Opening date not announced"}
              {board.registrationClosesAt
                ? ` · Closes ${formatLusaka(board.registrationClosesAt)}`
                : ""}
            </strong>
          </p>
        </div>
        <Link
          className={styles.primaryAction}
          href={
            registration
              ? registered
                ? "/student/timetable"
                : "/student/readiness"
              : "/student/register"
          }
        >
          {registration
            ? registered
              ? "My timetable"
              : "Check registration readiness"
            : "Check registration"}
          <span aria-hidden="true"> →</span>
        </Link>
      </section>
      <section
        className={styles.taskSection}
        aria-labelledby="student-tasks-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Continue your work</p>
            <h2 id="student-tasks-title">
              {registered ? "Your studies" : "Registration tasks"}
            </h2>
          </div>
          <Link href="/student/results">View official results</Link>
        </div>
        <div className={styles.grid}>
          {tasks.map((task) => (
            <article key={task.href} className={styles.taskCard}>
              <h3>{task.title}</h3>
              <p>{task.body}</p>
              <Link href={task.href}>
                {task.action}
                <span aria-hidden="true"> →</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section
        className={styles.recordSection}
        aria-labelledby="student-record-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Your record</p>
            <h2 id="student-record-title">Details and requests</h2>
          </div>
        </div>
        <div className={styles.recordGrid}>
          <div className={styles.recordPanel}>
            <h3>Onboarding progress</h3>
            <p>
              {board.onboardingRequiredComplete} of{" "}
              {board.onboardingRequiredTotal} required applicant tasks complete.
            </p>
            {board.pendingCorrections > 0 ? (
              <StatusChip tone="attention">
                {board.pendingCorrections} correction request
                {board.pendingCorrections === 1 ? "" : "s"} awaiting review
              </StatusChip>
            ) : (
              <p className={styles.meta}>
                No record corrections are awaiting review.
              </p>
            )}
          </div>
          <div className={styles.recordPanel}>
            <h3>Correction history</h3>
            {!corrections.data ? (
              <Notice
                severity="warning"
                title="History unavailable"
                message="We could not load correction history. Try again later; no new request was made."
              />
            ) : corrections.data.items.length === 0 ? (
              <p className={styles.meta}>No record correction requests yet.</p>
            ) : (
              <ul className={styles.history}>
                {corrections.data.items.map((correction) => (
                  <li key={correction.id}>
                    <p>
                      <strong>{correctionFieldLabel(correction.field)}</strong>{" "}
                      <StatusChip
                        tone={
                          correction.status === "APPROVED"
                            ? "success"
                            : correction.status === "REJECTED"
                              ? "error"
                              : "info"
                        }
                      >
                        {correctionStatusLabel(correction.status)}
                      </StatusChip>
                    </p>
                    <p className={styles.meta}>
                      {correction.requestedValue} — {correction.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <details className={styles.disclosure}>
          <summary>Update contact details</summary>
          <div className={styles.disclosureBody}>
            <ContactForm />
          </div>
        </details>
        <details className={styles.disclosure}>
          <summary>Request an official record correction</summary>
          <div className={styles.disclosureBody}>
            <p className={styles.meta}>
              The records office reviews your request. Your official record
              stays unchanged until approval.
            </p>
            <CorrectionForm />
          </div>
        </details>
      </section>
    </>
  );
}
