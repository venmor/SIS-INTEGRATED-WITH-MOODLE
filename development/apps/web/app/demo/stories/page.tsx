import Link from "next/link";
import styles from "../demo.module.css";

export default function DemoStoriesPage() {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Presenter story notes</p>
        <h1>Demo stories</h1>
        <p>
          Follow live Phase-6 routes until the boundary is explicitly marked
          as preview-only.
        </p>
      </header>

      <section className={styles.section}>
        <h2>Story 1 · Admissions to learning access</h2>
        <p>
          Start with Lombe A. at the released-offer checkpoint. Show the
          admissions decision, then use Phiri N. as the deterministic
          registered/cleared checkpoint for Student Finance, registration and
          Moodle handoff.
        </p>
        <p className={styles.links}>
          <Link href="/applications">Applicant applications</Link>
          <Link href="/student">Student workspace</Link>
          <Link href="/student/finance">Student Finance</Link>
        </p>
      </section>

      <section className={styles.section}>
        <h2>Story 2 · Teaching to official results</h2>
        <p>
          Begin with Mwila T. and demonstrate that tutorial-group authority is
          owned by SIS while Moodle receives the governed projection.
        </p>
        <p>
          <strong>Phase 7 preview.</strong> Assessment validation, staging,
          examination approval and official result publication are not live
          Phase-6 actions.
        </p>
        <p className={styles.previewBoundary}>
          Design preview · No live records or actions.
        </p>
        <p className={styles.links}>
          <Link href="/admin/teaching/groups">Teaching groups</Link>
          <Link href="/design-preview/assessment">Assessment preview</Link>
        </p>
      </section>

      <section className={styles.section}>
        <h2>Story 3 · Integration recovery</h2>
        <p>
          Use Kunda B. to inspect the seeded dead-letter attempt, compare SIS
          source truth with Moodle destination state, review the four-eyes
          replay consequence and reconcile the seeded mismatch.
        </p>
        <p className={styles.links}>
          <Link href="/admin/integration">Integration recovery</Link>
          <Link href="/admin/integration/reconciliation">Reconciliation</Link>
        </p>
      </section>
    </main>
  );
}
