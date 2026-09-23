import Link from "next/link";
import { studentPreview } from "../../data";
import styles from "../../preview.module.css";

const readiness = [
  {
    item: "Student record",
    state: "Ready",
    owner: "Registry",
  },
  {
    item: "Programme and intake",
    state: "Ready",
    owner: "Registry",
  },
  {
    item: "Financial clearance",
    state: "Awaiting institution",
    owner: "Finance",
  },
  {
    item: "Course package",
    state: "Action required",
    owner: "Student",
  },
  {
    item: "Registration declaration",
    state: "Blocked",
    owner: "Student",
  },
] as const;

export default function RegistrationReadinessPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Student portal · {studentPreview.academicPeriod} ·{" "}
          {studentPreview.studentNumber}
        </p>
        <h1>Registration readiness</h1>
        <p>{studentPreview.programme}</p>
      </header>

      <section
        className={styles.workspaceSection}
        aria-labelledby="readiness-heading"
      >
        <h2 id="readiness-heading">Readiness checks</h2>
        <ul className={styles.readinessList}>
          {readiness.map((check) => (
            <li key={check.item}>
              <span className={styles.readinessItem}>{check.item}</span>
              <span className={styles.readinessOwner}>{check.owner}</span>
              <span
                className={styles.readinessState}
                data-state={check.state}
              >
                {check.state}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.readinessNote}>
          Final registration remains unavailable until blocking checks are
          complete.
        </p>
        <Link className={styles.inlineLink} href="/design-preview/student">
          Back to student home
        </Link>
      </section>
    </main>
  );
}
