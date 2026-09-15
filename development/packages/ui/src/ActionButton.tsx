"use client";

import type { ButtonHTMLAttributes } from "react";
import styles from "./ActionButton.module.css";

export type ButtonType = "primary" | "secondary" | "tertiary" | "destructive";

/**
 * UI-ACTION-001 — Buttons and action hierarchy. One primary per region;
 * labels state action + object. After activation shows progress text, blocks
 * repeats, and announces to screen readers (never disabled-without-reason).
 */
export function ActionButton({
  kind = "primary",
  loadingText,
  pending,
  children,
  type,
  disabled,
  ...rest
}: {
  kind?: ButtonType;
  loadingText?: string;
  pending?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const isDisabled = pending || disabled;
  return (
    <>
      <button
        type={type ?? "submit"}
        className={`${styles.button} ${styles[kind] ?? ""}`}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...rest}
      >
        {pending && loadingText ? loadingText : children}
      </button>
      {pending && loadingText ? (
        <p className={styles.progress} role="status">
          {loadingText}
        </p>
      ) : null}
    </>
  );
}
