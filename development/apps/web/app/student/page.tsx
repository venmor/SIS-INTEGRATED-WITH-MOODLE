import type {
  StudentCorrectionView,
  StudentHomeView,
} from "@sis/contracts";
import Link from "next/link";
import { loadStudent } from "./server";
import { StudentUnavailable } from "./chrome";
import { Card, Notice, PageHeader, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import { ContactForm, CorrectionForm } from "./forms";
import styles from "./student.module.css";

// Student portal home: registration progress first, then required
// tasks as cards with owners and actions, then contact and correction
// workflows. Urgent actions are never buried under decoration.
export default async function StudentPage() {
  const home = await loadStudent<StudentHomeView>("/me/home", "/student");
  if (!home.data) return <StudentUnavailable message={home.message} />;
  const board = home.data;
  const corrections =
    await loadStudent<{ items: StudentCorrectionView[] }>(
      "/me/corrections",
      "/student",
    );
  const tasks = [
    {
      href: "/student/courses",
      title: "Plan your courses",
      body: "Choose permitted courses for the period. Validation explains every block.",
    },
    {
      href: "/student/readiness",
      title: "Registration readiness",
      body: "Every condition with its owner and next step before you submit.",
    },
    {
      href: "/student/register",
      title: "Review and submit registration",
      body: "Review the validated plan, accept declarations, submit once.",
    },
    {
      href: "/student/changes",
      title: "Course changes",
      body: "Request additions and drops after registration. Approvals only.",
    },
    {
      href: "/student/finance",
      title: "Finance and clearance",
      body: "Invoice, payments, clearance status and what blocks registration.",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow={`Student portal · ${board.period} · ${board.studentNumber}`}
        title="Welcome to the student portal"
        lede={`${board.displayName} · ${board.programmeName} · ${board.intake} · ${board.campus} · ${board.studyMode}. Registration opens ${board.registrationOpensAt ? formatLusaka(board.registrationOpensAt) : "on a date to be announced"}${board.registrationClosesAt ? ` and closes ${formatLusaka(board.registrationClosesAt)}` : ""}.`}
      />
      <Card title="Onboarding progress">
        <p className={styles.progress}>
          {board.onboardingRequiredComplete} of {board.onboardingRequiredTotal}{" "}
          required applicant tasks complete.{" "}
          {board.pendingCorrections > 0 ? (
            <StatusChip tone="attention">
              {board.pendingCorrections} correction request
              {board.pendingCorrections === 1 ? "" : "s"} awaiting review
            </StatusChip>
          ) : (
            <StatusChip tone="success">No corrections pending</StatusChip>
          )}
        </p>
      </Card>
      <h2 className={styles.sectionTitle}>Required tasks</h2>
      <div className={styles.grid}>
        {tasks.map((task) => (
          <Card key={task.href} title={task.title}>
            <p className={styles.taskBody}>{task.body}</p>
            <p className={styles.taskAction}>
              <Link href={task.href}>
                {task.title === "Plan your courses"
                  ? "Choose courses"
                  : task.title === "Registration readiness"
                    ? "Check readiness"
                    : task.title === "Review and submit registration"
                      ? "Review registration"
                      : task.title === "Course changes"
                        ? "Request changes"
                        : "Open finance"}
              </Link>
            </p>
          </Card>
        ))}
      </div>
      <Card title="Contact details">
        <ContactForm />
      </Card>
      <Card title="Request an official record correction">
        <p className={styles.meta}>
          Corrections are reviewed by the records office. The current record
          stays unchanged until approval, and approvals record old and new
          values.
        </p>
        <CorrectionForm />
      </Card>
      <Card title="Correction history">
        {!corrections.data || corrections.data.items.length === 0 ? (
          <Notice
            severity="info"
            title="No corrections"
            message="No record correction requests yet."
          />
        ) : (
          <ul className={styles.history}>
            {corrections.data.items.map((correction) => (
              <li key={correction.id}>
                <p>
                  <strong>
                    {correction.field}
                  </strong>{" "}
                  <StatusChip
                    tone={
                      correction.status === "APPROVED"
                        ? "success"
                        : correction.status === "REJECTED"
                          ? "error"
                          : "info"
                    }
                  >
                    {correction.status}
                  </StatusChip>
                </p>
                <p className={styles.meta}>
                  {correction.requestedValue} — {correction.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
