import { Skeleton, SkeletonCard } from "@sis/ui";
import styles from "../../../../page.module.css";

export default function ReviewCaseLoading() {
  return (
    <div className={styles.page}>
      <main className={styles.main} aria-busy="true" aria-live="polite">
        <p className={styles.context}>Admissions workspace</p>
        <Skeleton width="22rem" height="2.5rem" />
        <p className={styles.lede} role="status">
          Loading case evidence and history…
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(18rem, 0.8fr)",
            gap: "24px",
          }}
        >
          <SkeletonCard lines={6} />
          <SkeletonCard lines={4} />
        </div>
      </main>
    </div>
  );
}
