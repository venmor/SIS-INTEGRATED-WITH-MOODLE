import styles from "./Field.module.css";

interface FieldProps {
  id: string;
  label: string;
  help?: string;
  error?: string;
  autoComplete?: string;
  /** Uncontrolled restore value (filter/search forms re-render from URL). */
  defaultValue?: string;
  inputProps?: {
    type?: string;
    name?: string;
    required?: boolean;
    maxLength?: number;
    minLength?: number;
  };
}

/**
 * UI-FIELD-001 — Form field. Persistent visible label (never placeholder-only),
 * help text, per-field error with aria-describedby association. Managers and
 * paste are never blocked by this component.
 */
export function Field({ id, label, help, error, autoComplete, defaultValue, inputProps }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {help ? (
        <p className={styles.help} id={helpId}>
          {help}
        </p>
      ) : null}
      <input
        className={`${styles.input} ${error ? styles.invalid : ""}`}
        id={id}
        name={inputProps?.name ?? id}
        type={inputProps?.type ?? "text"}
        required={inputProps?.required}
        maxLength={inputProps?.maxLength}
        minLength={inputProps?.minLength}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
