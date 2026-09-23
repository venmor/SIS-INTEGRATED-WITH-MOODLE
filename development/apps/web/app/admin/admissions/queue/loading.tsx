import { Skeleton, SkeletonQueue } from "@sis/ui";
import styles from "../../../page.module.css";

export default function AdmissionsQueueLoading() {
  return (
    <div className={styles.page}>
      <main className={styles.main} aria-busy="true" aria-live="polite">
        <p className={styles.context}>Admissions workspace</p>
        <Skeleton width="18rem" height="2.5rem" />
        <p className={styles.lede} role="status">
          Loading admissions cases…
        </p>
        <Skeleton width="22rem" height="2.75rem" radius="md" />
        <SkeletonQueue rows={5} />
      </main>
    </div>
  );
}
