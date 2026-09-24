import Link from "next/link";
import styles from "../../preview.module.css";

const results = [
  {
    code: "SWE111",
    title: "Programming Fundamentals",
    grade: "B+",
    credits: 15,
    state: "Published official result",
  },
  {
    code: "MTH111",
    title: "Discrete Mathematics",
    grade: "A",
    credits: 15,
    state: "Published official result",
  },
];

export default function StudentResultsPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Student portal · STU-DEMO-0001 · 2026S1
        </p>
        <h1>Official results</h1>
        <p>
          Students see only results published from the official SIS release
          process. Unreleased assessment work remains outside this view.
        </p>
      </header>

      <section className={styles.workspaceSection} aria-label="Published official results">
        <h2>Published official results</h2>
        <ul className={styles.courseList}>
          {results.map((result) => (
            <li className={styles.courseRecord} key={result.code}>
              <div className={styles.courseIdentity}>
                <h3>
                  {result.code} — {result.title}
                </h3>
                <p className={styles.courseMeta}>
                  {result.credits} credits · {result.state}
                </p>
              </div>
              <div className={styles.courseSide}>
                <strong>{result.grade}</strong>
                <span className={styles.courseState}>Official SIS record</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.workspaceSection}>
        <h2>Authority and visibility</h2>
        <p className={styles.readinessNote}>
          System administrators do not edit results. Academic validation and
          Registry release use their own scoped authorities, and students only
          receive the published outcome.
        </p>
      </section>

      <p>
        <Link className={styles.inlineLink} href="/design-preview/student">
          Back to student preview
        </Link>
      </p>
    </main>
  );
}
