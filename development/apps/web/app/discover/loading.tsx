import { Skeleton, SkeletonCard } from "@sis/ui";
import styles from "../page.module.css";

export default function DiscoverLoading() {
  return (
    <div className={styles.page}>
      <main className={styles.main} aria-busy="true" aria-live="polite">
        <p className={styles.context}>Admissions · Public catalogue</p>
        <h1 className={styles.title}>Find a programme</h1>
        <p className={styles.lede} role="status">
          Searching programmes…
        </p>
        <Skeleton width="100%" height="4.75rem" radius="md" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
            gap: "16px",
          }}
        >
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </main>
    </div>
  );
}
