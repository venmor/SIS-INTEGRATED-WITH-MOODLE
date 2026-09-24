import type {
  StudentCorrectionView,
  StudentHomeView,
} from "@sis/contracts";
import Link from "next/link";
import { loadStudent } from "./server";
import { StudentUnavailable } from "./chrome";
import { Card, Icon, Notice, PageHeader, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import { ContactForm, CorrectionForm } from "./forms";
import styles from "./student.module.css";

export default async function StudentPage() {
  const home = await loadStudent<StudentHomeView>("/me/home", "/student");
  if (!home.data) return <StudentUnavailable message={home.message} />;

  const board = home.data;
  const corrections =
    await loadStudent<{ items: StudentCorrectionView[] }>(
      "/me/corrections",
      "/student",
    );

  const requiredAction =
    board.pendingCorrections > 0
      ? {
          icon: "alert" as const,
          title: "Follow up record corrections",
          detail: `${board.pendingCorrections} correction request${board.pendingCorrections === 1 ? "" : "s"} awaiting review.`,
          label: "Review corrections",
          href: "#corrections",
        }
      : {
          icon: "readiness" as const,
          title: "Check registration readiness",
          detail: "Confirm academic and financial conditions before submission.",
          label: "Check readiness",
          href: "/student/readiness",
        };

  return (
    <>
      <PageHeader
        eyebrow={`Student portal · ${board.period} · ${board.studentNumber}`}
        title="Student home"
        lede={`${board.displayName} · ${board.programmeName} · ${board.intake} · ${board.campus} · ${board.studyMode}`}
      />

      <section
        className={styles.homeSection}
        aria-labelledby="required-action-heading"
      >
        <div className={styles.sectionHeading}>
          <Icon name={requiredAction.icon} size={20} />
          <h2 id="required-action-heading">Required action</h2>
        </div>
        <div className={styles.priorityRow}>
          <div>
            <strong>{requiredAction.title}</strong>
            <p>{requiredAction.detail}</p>
          </div>
          <Link href={requiredAction.href}>
            {requiredAction.label}
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </section>

      <section
        className={styles.homeSection}
        aria-labelledby="registration-heading"
      >
        <div className={styles.sectionHeading}>
          <Icon name="registration" size={20} />
          <h2 id="registration-heading">Registration</h2>
        </div>
        <div className={styles.statusFacts}>
          <div>
            <span>Onboarding</span>
            <strong>
              {board.onboardingRequiredComplete} of {board.onboardingRequiredTotal} complete
            </strong>
          </div>
          <div>
            <span>Opens</span>
            <strong>
              {board.registrationOpensAt
                ? formatLusaka(board.registrationOpensAt)
                : "Date to be announced"}
            </strong>
          </div>
          <div>
            <span>Closes</span>
            <strong>
              {board.registrationClosesAt
                ? formatLusaka(board.registrationClosesAt)
                : "Date to be announced"}
            </strong>
          </div>
        </div>
        <div className={styles.inlineActions}>
          <Link href="/student/readiness">Readiness</Link>
          <Link href="/student/register">Review registration</Link>
        </div>
      </section>

      <section className={styles.homeSection} aria-labelledby="finance-heading">
        <div className={styles.sectionHeading}>
          <Icon name="finance" size={20} />
          <h2 id="finance-heading">Finance</h2>
        </div>
        <div className={styles.priorityRow}>
          <div>
            <strong>Clearance and payments</strong>
            <p>See charges, payments and whether finance blocks registration.</p>
          </div>
          <Link href="/student/finance">
            Open finance
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </section>

      <section className={styles.homeSection} aria-labelledby="courses-heading">
        <div className={styles.sectionHeading}>
          <Icon name="courses" size={20} />
          <h2 id="courses-heading">Courses and changes</h2>
        </div>
        <div className={styles.homeRows}>
          <Link href="/student/courses">
            <span>
              <strong>Plan courses</strong>
              <small>Choose permitted courses for the active period.</small>
            </span>
            <Icon name="arrowRight" size={16} />
          </Link>
          <Link href="/student/changes">
            <span>
              <strong>Course changes</strong>
              <small>Request approved additions or drops after registration.</small>
            </span>
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </section>

      <Card title="Contact details">
        <ContactForm />
      </Card>

      <Card title="Request an official record correction">
        <p className={styles.meta}>
          Records stay unchanged until the records office approves a correction.
        </p>
        <CorrectionForm />
      </Card>

      <section id="corrections">
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
                    <strong>{correction.field}</strong>{" "}
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
      </section>
    </>
  );
}
