import styles from "../page.module.css";

// Suspense fallback for client-side discovery transitions (Part 2 §3.3:
// stable skeleton cards + "Searching programmes" announced to screen
// readers). Initial loads are server-rendered; this covers in-app
// navigation between filter/compare/wizard states.
export default function DiscoverLoading() {
  return (
    <div className={styles.page}>
      <main className={styles.main} aria-busy="true" aria-live="polite">
        <p className={styles.context}>Admissions · Public catalogue</p>
        <h1 className={styles.title}>Find a programme</h1>
        <p className={styles.lede} role="status">
          Searching programmes…
        </p>
      </main>
    </div>
  );
}
