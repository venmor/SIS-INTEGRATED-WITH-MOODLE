"use client";

import { useEffect, useRef } from "react";
import styles from "./DeniedPanel.module.css";

/**
 * UI-DENIED-001 — Access denial (detail: UI-ACCESS-001 §14.34).
 * States what was not completed with the minimum safe reason, offers the
 * four safe routes, never confirms hidden records, never blames the user,
 * never a bare "403 Forbidden". Attention tint keeps denied visually
 * distinct from error/empty/loading states. Full contract: README.
 */
export function DeniedPanel({ message, reference }: { message: string; reference?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [message]);
  return (
    <section ref={ref} className={styles.denied} role="alert" aria-label="Access denied" tabIndex={-1}>
      <strong className={styles.title}>This action was not completed.</strong>
      <p className={styles.message}>{message}</p>
      <ul className={styles.routes}>
        <li>
          <a href="/">Switch to an authorized workspace</a>
        </li>
        <li>Ask an administrator for access to this area.</li>
        <li>
          <a href="/sign-in">Return to permitted work</a>
        </li>
      </ul>
      <p className={styles.support}>
        Contact the service desk
        {reference ? (
          <>
            {" "}
            and quote reference <code>{reference}</code>
          </>
        ) : null}
        .
      </p>
    </section>
  );
}
