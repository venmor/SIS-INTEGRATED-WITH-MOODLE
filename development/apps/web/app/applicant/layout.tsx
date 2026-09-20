import Link from "next/link";
import { ApplicantSignOut } from "./sign-out";
import styles from "./applicant.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Applicant portal",
  robots: { index: false, follow: false },
};

export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#applicant-content">
        Skip to application content
      </a>
      <header className={styles.header}>
        <Link href="/applicant">
          <strong>Applicant portal</strong>
        </Link>
        <nav className={styles.nav} aria-label="Applicant navigation">
          <Link href="/applicant">My applications</Link>
          <Link href="/discover">Find a programme</Link>
          <Link href="/applicant/help">Help</Link>
          <ApplicantSignOut />
        </nav>
      </header>
      <main id="applicant-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
