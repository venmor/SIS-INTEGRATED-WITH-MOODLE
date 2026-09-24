"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./page.module.css";

// Root route boundary: something unexpected failed. Explains what
// happened, what was preserved, and the safe next step — never a code.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged server-side by default in production; digest identifies it.
  }, [error]);
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>We could not show this page</h1>
        <p>
          Something unexpected happened. Your saved work is kept — nothing
          was submitted twice by this error.
        </p>
        <p>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>{" "}
          <Link href="/">Back home</Link>
        </p>
        {error.digest ? <p>Reference: {error.digest}</p> : null}
      </main>
    </div>
  );
}
