import Link from "next/link";
import styles from "../preview.module.css";

const queue = [
  {
    student: "STU-DEMO-0201",
    assessment: "Quiz 1",
    state: "Missing",
    detail: "No Moodle mark is available for the mapped activity.",
  },
  {
    student: "STU-DEMO-0202",
    assessment: "Lab 2",
    state: "Out of range",
    detail: "Imported value is 108/100 and needs lecturer correction.",
  },
  {
    student: "STU-DEMO-0203",
    assessment: "Project checkpoint",
    state: "Unmapped",
    detail: "Moodle activity has no approved SIS assessment mapping.",
  },
];

export default function AssessmentPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Assessment workspace · LECTURER · OFFERING:SWE111-2026S1
        </p>
        <h1>Assessment validation queue</h1>
        <p>
          Provisional Moodle marks are not official SIS results. Import,
          validation, staging, examination approval and publication are
          separate steps.
        </p>
      </header>

      <section
        className={styles.workspaceSection}
        aria-label="Validation queue"
      >
        <h2>Validation queue</h2>
        <ul className={styles.opsList}>
          {queue.map((item) => (
            <li key={item.student + item.assessment}>
              <div className={styles.opsRecord}>
                <strong>
                  {item.student} · {item.assessment}
                </strong>
                <span className={styles.opsMeta}>{item.detail}</span>
              </div>
              <span className={styles.opsState}>{item.state}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.workspaceSection}>
        <h2>Authority boundary</h2>
        <p className={styles.readinessNote}>
          A lecturer can correct imported assessment data only inside an
          assigned offering, then stage a complete set for examination
          validation. Staging does not publish a student result.
        </p>
        <p>
          Planned live route: <code>/admin/assessment</code>. It is documented
          here only and is not linked until the Phase-7 API exists.
        </p>
      </section>

      <p>
        <Link className={styles.inlineLink} href="/design-preview/assessment/staging">
          Review staging preview
        </Link>
      </p>
    </main>
  );
}
