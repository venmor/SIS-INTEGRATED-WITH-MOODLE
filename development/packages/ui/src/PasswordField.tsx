"use client";

import { useState } from "react";
import styles from "./Field.module.css";

/**
 * UI-FIELD-003 — Password creation and sign-in field (§14.7).
 * Show/hide with accessible label, caps-lock warning, manager + paste never
 * blocked, policy guidance from config (never hardcoded minimums).
 */
export function PasswordField({
  id,
  label,
  help,
  error,
  autoComplete = "current-password",
  policyGuidance,
  required,
  minLength,
  maxLength,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  autoComplete?: string;
  policyGuidance?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const guidance = help ?? policyGuidance;
  const helpId = guidance ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {(help ?? policyGuidance) ? (
        <p className={styles.help} id={helpId}>
          {help ?? policyGuidance}
        </p>
      ) : null}
      <input
        className={`${styles.input} ${error ? styles.invalid : ""}`}
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onKeyUp={(event) => {
          const caps = event.getModifierState?.("CapsLock") ?? false;
          setCapsOn(caps);
        }}
        onBlur={() => setCapsOn(false)}
      />
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={visible}
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? "Hide" : "Show"}
      </button>
      {capsOn ? (
        <p className={styles.help} role="status">
          Caps Lock appears to be on.
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
