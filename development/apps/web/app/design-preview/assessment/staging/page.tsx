import Link from "next/link";
import styles from "../../preview.module.css";

const rows = [
  ["Quiz 1", "Mapped", "24 provisional marks", "Ready"],
  ["Lab 2", "Mapped", "23 valid · 1 correction", "Needs correction"],
  ["Project checkpoint", "Unmapped", "No approved SIS mapping", "Blocked"],
];

export default function AssessmentStagingPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Assigned scope · SWE111 · 2026S1 · LECTURER
        </p>
        <h1>Stage assessment set</h1>
        <p>
          Correct provisional data in the assigned scope, resolve mappings,
          then stage the set for examination validation.
        </p>
      </header>

      <section className={styles.workspaceSection} aria-label="Assigned assessment scope">
        <h2>Assigned assessment scope</h2>
        <ul className={styles.reconciliationList}>
          {rows.map(([assessment, mapping, detail, state]) => (
            <li key={assessment}>
              <div className={styles.opsRecord}>
                <strong>{assessment}</strong>
                <span className={styles.opsMeta}>
                  {mapping} · {detail}
                </span>
              </div>
              <span className={styles.reconciliationState}>{state}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.workspaceSection} aria-label="Staging consequence">
        <h2>Staging consequence</h2>
        <p className={styles.readinessNote}>
          Staging freezes the lecturer-reviewed version for the next authority.
          It does not create an official result and it does not expose
          provisional marks to students.
        </p>
        <p>
          Future live action: stage the valid SWE111 set for examination
          validation. No mutation is available in this preview.
        </p>
      </section>

      <p>
        <Link className={styles.inlineLink} href="/design-preview/assessment/release">
          Review validation and release preview
        </Link>
      </p>
    </main>
  );
}
