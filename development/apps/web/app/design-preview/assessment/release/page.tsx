import Link from "next/link";
import styles from "../../preview.module.css";

export default function AssessmentReleasePreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Assessment governance · fictional Phase-7 preview
        </p>
        <h1>Validate and release results</h1>
        <p>
          Examination validation and official result release are separate
          authorities. One step cannot silently perform the other.
        </p>
      </header>

      <div className={styles.authorityGrid}>
        <section className={styles.authorityPanel} aria-label="Examination validation">
          <h2>Examination validation</h2>
          <dl className={styles.authorityFacts}>
            <div>
              <dt>Authority</dt>
              <dd>Examination board / delegated examination officer</dd>
            </div>
            <div>
              <dt>Input</dt>
              <dd>Lecturer-staged assessment set</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>Validated set ready for release authority</dd>
            </div>
          </dl>
          <p className={styles.authorityNote}>
            Validation confirms academic evidence; it does not publish the
            result to the student.
          </p>
        </section>

        <section className={styles.authorityPanel} aria-label="Official result release">
          <h2>Official result release</h2>
          <dl className={styles.authorityFacts}>
            <div>
              <dt>Authority</dt>
              <dd>Registry / Results release authority</dd>
            </div>
            <div>
              <dt>Input</dt>
              <dd>Examination-validated result set</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>Published official SIS result</dd>
            </div>
          </dl>
          <p className={styles.authorityNote}>
            Release publishes the validated SIS record; it never promotes a
            raw Moodle mark directly.
          </p>
        </section>
      </div>

      <section className={styles.workspaceSection}>
        <h2>System administration boundary</h2>
        <p className={styles.readinessNote}>
          System administrators maintain identity and platform access. They do
          not receive result-edit, validation or release authority from that
          technical role.
        </p>
      </section>

      <p>
        <Link className={styles.inlineLink} href="/design-preview/student/results">
          View the student result preview
        </Link>
      </p>
    </main>
  );
}
