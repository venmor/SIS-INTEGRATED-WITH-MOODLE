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
        <p>
          Your application is a draft until you review it and select{" "}
          <strong>Submit application</strong>. Admissions cannot assess a draft.
        </p>
      ) : (
        <p>{application.lockReason ?? "This application is read-only."}</p>
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
    ["tickets", "Support tickets"],
    ["withdraw", "Withdraw application"],
  ];
  return (
    <nav aria-label="Submitted application">
      <ul className={styles.steps}>
        {items.map(([key, label]) => (
          <li key={key}>
            <Link href={applicationPath(applicationId, key)}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ApplicationSteps({  application,
}: {
  application: ApplicationView;
}) {
  return (
    <nav aria-label="Application sections">
      <p>
        {application.completeCount} of {application.requiredCount} required
        sections complete
      </p>
      <ol className={styles.steps}>
        {application.sections.map((section) => (
          <li key={section.key}>
            <Link
              href={applicationPath(
                application.id,
                section.key === "documents"
                  ? "documents"
                  : section.key === "review"
                    ? "review"
                    : section.key,
              )}
            >
              {section.label}
              <span>{section.state.replaceAll("_", " ")}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
