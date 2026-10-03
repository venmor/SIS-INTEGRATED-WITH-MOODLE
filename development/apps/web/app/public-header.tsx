import Link from "next/link";
import styles from "./public-header.module.css";

export function PublicHeader({
  current,
}: {
  current?: "home" | "discover" | "sign-in";
}) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="SIS home">
        <span className={styles.mark} aria-hidden="true">
          SIS
        </span>
        <span>
          <strong>Student Information System</strong>
          <small>University services</small>
        </span>
      </Link>
      <nav className={styles.nav} aria-label="Public navigation">
        <Link href="/" aria-current={current === "home" ? "page" : undefined}>
          Home
        </Link>
        <Link
          href="/discover"
          aria-current={current === "discover" ? "page" : undefined}
        >
          Find a programme
        </Link>
        <Link
          href="/sign-in"
          aria-current={current === "sign-in" ? "page" : undefined}
          className={styles.signIn}
        >
          Sign in
        </Link>
      </nav>
    </header>
  );
}
