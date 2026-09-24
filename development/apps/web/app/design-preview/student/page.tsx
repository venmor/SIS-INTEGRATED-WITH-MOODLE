import Link from "next/link";
import { studentPreview } from "../data";
import styles from "../preview.module.css";

export default function StudentPreviewPage() {
  const studentTask = studentPreview.tasks.find(
    (task) => task.owner === "Student",
  );
  const institutionTask = studentPreview.tasks.find(
    (task) => task.owner !== "Student",
  );

  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Student portal · {studentPreview.academicPeriod} ·{" "}
          {studentPreview.studentNumber}
        </p>
        <h1>Student home</h1>
        <p>{studentPreview.programme} · {studentPreview.campus}</p>
      </header>

      <section
        className={styles.workspaceSection}
        aria-labelledby="registration-heading"
      >
        <h2 id="registration-heading">Registration</h2>
        <div className={styles.primaryStatus}>
          <div className={styles.statusCopy}>
            <strong>{studentPreview.registrationState}</strong>
            <p>
              {studentPreview.registrationProgress.complete} of{" "}
              {studentPreview.registrationProgress.total} steps complete.
            </p>
            <p>Next: {studentPreview.nextAction}.</p>
            <Link
              className={styles.inlineLink}
              href="/design-preview/student/registration"
            >
              View registration readiness
            </Link>
          </div>
          <dl className={styles.statusFacts}>
            <div>
              <dt>Deadline</dt>
              <dd>{studentPreview.deadline}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>Student and institution</dd>
            </div>
          </dl>
        </div>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="required-action-heading"
      >
        <h2 id="required-action-heading">Required action</h2>
        <ul className={styles.taskList}>
          {studentTask ? (
            <li>
              <div className={styles.taskMain}>
                <strong>{studentTask.title}</strong>
                <p className={styles.taskMeta}>
                  Due {studentTask.due} · {studentTask.owner}
                </p>
              </div>
              <span className={styles.taskState} data-tone="action">
                {studentTask.state}
              </span>
            </li>
          ) : null}
          {institutionTask ? (
            <li>
              <div className={styles.taskMain}>
                <strong>{institutionTask.title}</strong>
                <p className={styles.taskMeta}>
                  {institutionTask.owner} · Due {institutionTask.due}
                </p>
              </div>
              <span className={styles.taskState} data-tone="waiting">
                {institutionTask.state}
              </span>
            </li>
          ) : null}
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="holds-heading"
      >
        <h2 id="holds-heading">Holds</h2>
        <ul className={styles.holdList}>
          {studentPreview.holds.map((hold) => (
            <li key={hold.title}>
              <div className={styles.holdMain}>
                <strong>{hold.title}</strong>
                <p className={styles.holdMeta}>
                  {hold.effect} · {hold.owner}
                </p>
              </div>
              <span className={styles.holdState}>{hold.state}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="current-period-heading"
      >
        <h2 id="current-period-heading">Current period</h2>
        <dl className={styles.periodFacts}>
          <div>
            <dt>Programme</dt>
            <dd>{studentPreview.programme}</dd>
          </div>
          <div>
            <dt>Campus</dt>
            <dd>{studentPreview.campus}</dd>
          </div>
          <div>
            <dt>SIS registration</dt>
            <dd>{studentPreview.moodle.sisRegistration}</dd>
          </div>
          <div>
            <dt>Moodle learning access</dt>
            <dd>{studentPreview.moodle.learningAccess}</dd>
          </div>
          <div>
            <dt>Last confirmed</dt>
            <dd>{studentPreview.moodle.lastConfirmed}</dd>
          </div>
        </dl>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="updates-heading"
      >
        <h2 id="updates-heading">Recent updates</h2>
        <p className={styles.taskMeta}>
          No new student updates in this fictional preview.
        </p>
      </section>
    </main>
  );
}
