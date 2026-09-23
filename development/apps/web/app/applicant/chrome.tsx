import Link from "next/link";
import { Notice } from "@sis/ui";
import type { ApplicationView } from "@sis/contracts";
import { formatLusaka } from "../../lib/time";
import { applicationPath } from "./api";
import styles from "./applicant.module.css";

export function ApplicationContext({
  application,
}: {
  application: ApplicationView;
}) {
  return (
    <section
      className={`${styles.card} ${styles.context}`}
      aria-label="Selected application"
    >
      <p>
        <strong>{application.offering.programmeName}</strong> ·{" "}
        {application.offering.intake}
      </p>
      <p>
        {application.offering.studyMode} · {application.offering.campus}
      </p>
      <p>
        {application.state === "Submitted" ? "Submission" : "Draft"} reference:{" "}
        {application.reference}
      </p>
      <p>
        Deadline:{" "}
        {application.offering.deadline
          ? formatLusaka(application.offering.deadline)
          : "Contact Admissions for the published deadline."}
      </p>
      <p className={styles.muted}>
        Last saved: {formatLusaka(application.updatedAt)} · Version{" "}
        {application.version}
      </p>
      {application.editable ? (
        <p>Draft — not submitted.</p>
      ) : (
        <p>{application.lockReason ?? "Read-only."}</p>
      )}
    </section>
  );
}

export function ApplicationUnavailable({ message }: { message: string }) {
  return (
    <>
      <h1>Application unavailable</h1>
      <Notice
        severity="attention"
        title="We could not open this application"
        message={message}
      />
      <div className={styles.actions}>
        <Link href="/applicant">Return to applicant home</Link>
        <Link href="/">Choose workspace</Link>
      </div>
    </>
  );
}

export function ApplicationCaseNav({
  applicationId,
}: {
  applicationId: string;
}) {
  const items: Array<[string, string]> = [
    ["status", "Status and timeline"],
    ["clarifications", "Clarification requests"],
    ["corrections", "Correction requests"],
    ["decision", "Admission decision"],
    ["offer", "Admission offer"],
    ["onboarding", "Onboarding tasks"],
    ["tickets", "Support tickets"],
    ["withdraw", "Withdraw application"],
  ];

  return (
    <nav aria-label="Submitted application">
      <ul className={`${styles.steps} ${styles.caseNav}`}>
        {items.map(([key, label]) => (
          <li key={key}>
            <Link href={applicationPath(applicationId, key)}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ApplicationSteps({
  application,
}: {
  application: ApplicationView;
}) {
  const completedStates = new Set([
    "COMPLETE",
    "Complete",
    "NOT_REQUIRED",
    "NotRequired",
  ]);
  const nextSection = application.sections.find(
    (section) => !completedStates.has(section.state),
  );
  const sectionHref = (key: string) =>
    applicationPath(
      application.id,
      key === "documents" ? "documents" : key === "review" ? "review" : key,
    );

  return (
    <nav aria-label="Application sections">
      <section className={styles.progressPanel} aria-label="Application progress">
        <div className={styles.progressHeader}>
          <p>
            {application.completeCount} of {application.requiredCount} required
            sections complete
          </p>
          <progress
            value={application.completeCount}
            max={Math.max(application.requiredCount, 1)}
            aria-label="Application completion"
          />
        </div>

        {nextSection ? (
          <p className={styles.nextStep}>
            <strong>Next required step:</strong> {nextSection.label}
          </p>
        ) : (
          <p className={styles.nextStep}>
            <strong>Next:</strong> Review and submit.
          </p>
        )}
      </section>

      <ol className={`${styles.steps} ${styles.applicationSteps}`}>
        {application.sections.map((section) => (
          <li key={section.key} data-state={section.state}>
            <Link href={sectionHref(section.key)}>
              {section.label}
              <span>{section.state.replaceAll("_", " ")}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
