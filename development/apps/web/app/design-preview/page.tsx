import Link from "next/link";
import styles from "./preview.module.css";

export default function DesignPreviewPage() {
  return (
    <main className={styles.previewMain}>
      <div className={styles.previewIntro}>
        <p className={styles.previewContext}>Handbook experience studies</p>
        <h1>Experience previews</h1>
        <p>
          Fictional screens for reviewing future student and teaching
          workspaces.
        </p>
      </div>

      <div className={styles.previewChoices}>
        <Link href="/design-preview/student">
          <strong>Student home preview</strong>
          <span>Registration, holds, current period and learning state.</span>
        </Link>
        <Link href="/design-preview/teaching">
          <strong>Teaching workspace preview</strong>
          <span>Current teaching work, courses and SIS–Moodle state.</span>
        </Link>
      </div>
    </main>
  );
}
