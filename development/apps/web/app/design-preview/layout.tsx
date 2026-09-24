import type { Metadata } from "next";
import Link from "next/link";
import styles from "./preview.module.css";

export const metadata: Metadata = {
  title: "SIS experience preview",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.previewShell}>
      <header className={styles.previewHeader}>
        <div
          className={styles.previewNotice}
          role="status"
          aria-label="Design preview"
        >
          <strong>Design preview</strong>
          <span>No live records or actions.</span>
        </div>
        <nav className={styles.previewNav} aria-label="Preview workspaces">
          <Link href="/design-preview">Overview</Link>
          <Link href="/design-preview/student">Student</Link>
          <Link href="/design-preview/teaching">Teaching</Link>
          <Link href="/design-preview/assessment">Assessment</Link>
          <Link href="/design-preview/student/results">Results</Link>
          <Link href="/design-preview/operations">Operations</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
