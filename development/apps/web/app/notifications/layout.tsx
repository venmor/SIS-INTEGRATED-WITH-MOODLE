import Link from "next/link";
import styles from "./notifications.module.css";
export default function NotificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <span className={styles.mark} aria-hidden="true">
            SIS
          </span>
          <span>Notification centre</span>
        </Link>
        <nav className={styles.nav} aria-label="Notification navigation">
          <Link href="/">Workspace home</Link>
          <Link href="/sign-in">Switch account</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
