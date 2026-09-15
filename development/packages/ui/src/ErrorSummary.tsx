"use client";

import { useEffect, useRef } from "react";
import styles from "./ErrorSummary.module.css";

/**
 * UI-ERROR-001 — Error summary. Lists every error linking to its field,
 * keeps valid entries (form-owned), moves focus to itself on appearance
 * (§16.3, 04/03). Render only when errors exist.
 */
export function ErrorSummary({
  title,
  errors,
}: {
  title: string;
  errors: { fieldId: string; message: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const count = errors.length;
  useEffect(() => {
    if (count > 0) ref.current?.focus();
  }, [count, title]);

  if (errors.length === 0) return null;
  return (
    <div
      ref={ref}
      className={styles.summary}
      role="alert"
      aria-label={title}
      tabIndex={-1}
    >
      <strong className={styles.title}>{title}</strong>
      <ul>
        {errors.map((error, index) => (
          <li key={`${error.fieldId}-${index}`}>
            <a href={`#${error.fieldId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
