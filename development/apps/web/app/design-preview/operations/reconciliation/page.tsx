import styles from "../../preview.module.css";

export default function ReconciliationPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.reconciliationHeader}>
        <p className={styles.workspaceContext}>
          Integration Support workspace · Production environment
        </p>
        <h1>Reconciliation case</h1>
        <p>Moodle enrolment mismatch</p>
        <div className={styles.reconciliationSummary}>
          <span>STU-202700123 · CSC 4792</span>
          <span>Open</span>
          <span>Last confirmed 14:02 CAT</span>
        </div>
      </header>

      <div className={styles.authorityGrid}>
        <section className={styles.authorityPanel} aria-label="SIS source">
          <h2>SIS source</h2>
          <dl className={styles.authorityFacts}>
            <div>
              <dt>Registration</dt>
              <dd>Registered · CSC 4792</dd>
            </div>
            <div>
              <dt>Class list</dt>
              <dd>Included</dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>Official academic registration</dd>
            </div>
          </dl>
        </section>

        <section
          className={styles.authorityPanel}
          aria-label="Moodle destination"
        >
          <h2>Moodle destination</h2>
          <dl className={styles.authorityFacts}>
            <div>
              <dt>Enrolment</dt>
              <dd>Enrolment missing</dd>
            </div>
            <div>
              <dt>Last confirmed</dt>
              <dd>14:02 CAT</dd>
            </div>
            <div>
              <dt>Next safe action</dt>
              <dd>Retry valid Moodle enrolment delivery</dd>
            </div>
          </dl>
        </section>
      </div>

      <p className={styles.authorityNote}>
        SIS registration remains authoritative.
      </p>
    </main>
  );
}
