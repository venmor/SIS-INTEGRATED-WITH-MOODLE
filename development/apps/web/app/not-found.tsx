import Link from "next/link";
import styles from "./page.module.css";

// Unknown routes explain instead of accusing: no bare 404.
export default function NotFound() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>This page does not exist</h1>
        <p>
          The address may be mistyped, or the page may have moved. Your
          account and saved work are unaffected.
        </p>
        <p>
          <Link href="/">Back home</Link> ·{" "}
          <Link href="/discover">Browse programmes</Link>
        </p>
      </main>
    </div>
  );
}
